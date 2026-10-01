import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import SharknameCard from '../src/components/SharknameCard';
import { hasSharkWord } from '../../shared/sharkname';
import { isValidHandle } from '../../shared/handles';
import { server } from './mocks/server';

// "Your sharkname" on the Profile (SharknameCard): the handle friends add you
// by, rolled with Generate (shared/sharkname.ts) and saved through
// op=friends-handle, and what friends see of you, saved through op=identity
// (migration 055).

const ADA = { realName: 'Ada Lovelace', photo: 'https://lh3.googleusercontent.com/a/ada' };
const LATER = new Date(Date.now() + 20 * 86_400_000).toISOString();
const EARLIER = new Date(Date.now() - 86_400_000).toISOString();

interface HandleRow { handle: string | null; discoverable: boolean; country: string | null; canChangeAt: string | null }
interface IdentityRow { showRealName: boolean; showPhoto: boolean; realName: string | null; photo: string | null }

/** A stand-in for the two ops, holding one learner's rows. */
function serve(options: {
  handle?: Partial<HandleRow>;
  identity?: Partial<IdentityRow>;
  taken?: string[];
  identityFails?: boolean;
} = {}) {
  const handle: HandleRow = { handle: 'thirsty-sharkie', discoverable: true, country: null, canChangeAt: EARLIER, ...options.handle };
  const identity: IdentityRow = { showRealName: false, showPhoto: false, ...ADA, ...options.identity };
  const handlePuts: unknown[] = [];
  const identityPuts: unknown[] = [];
  server.use(
    http.get('*/api/user/friends-handle', () => HttpResponse.json(handle)),
    http.put('*/api/user/friends-handle', async ({ request }) => {
      const body = (await request.json()) as { handle: string };
      handlePuts.push(body);
      if (options.taken?.includes(body.handle.toLowerCase())) {
        return HttpResponse.json({ error: { code: 'handle_taken', message: 'That sharkname is already taken' } }, { status: 409 });
      }
      handle.handle = body.handle;
      handle.canChangeAt = LATER;
      return HttpResponse.json({ handle: body.handle });
    }),
    http.get('*/api/user/identity', () => HttpResponse.json(identity)),
    http.put('*/api/user/identity', async ({ request }) => {
      const body = (await request.json()) as { showRealName?: boolean; showPhoto?: boolean };
      identityPuts.push(body);
      if (options.identityFails) {
        return HttpResponse.json({ error: { code: 'db_error', message: 'Could not save what friends see' } }, { status: 500 });
      }
      if (body.showRealName !== undefined) identity.showRealName = body.showRealName;
      if (body.showPhoto !== undefined) identity.showPhoto = body.showPhoto;
      return HttpResponse.json(identity);
    }),
  );
  return { handlePuts, identityPuts, handle, identity };
}

function renderCard(props: { focus?: boolean; onFocused?: () => void } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LanguageProvider><SharknameCard {...props} /></LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const field = () => screen.findByRole('textbox', { name: 'Sharkname' });
const reducedMotion = (reduce: boolean) => {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'), media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  }) as MediaQueryList);
};
afterEach(() => reducedMotion(false));

describe('your sharkname', () => {
  it('shows the current sharkname in the field', async () => {
    serve();
    renderCard();
    expect(await field()).toHaveValue('thirsty-sharkie');
    expect(screen.getByRole('heading', { name: 'Your sharkname' })).toBeInTheDocument();
    expect(screen.getByText('Friends add you by your sharkname. You can change it once every 30 days.')).toBeInTheDocument();
    // Nothing changed yet, so there is nothing to save.
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('rolls a new shark name with Generate, says so, and saves it only on Save', async () => {
    reducedMotion(true);
    const { handlePuts } = serve();
    renderCard();
    const input = await field();
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    const rolled = (input as HTMLInputElement).value;
    expect(rolled).not.toBe('thirsty-sharkie');
    expect(isValidHandle(rolled) && hasSharkWord(rolled)).toBe(true);
    expect(screen.getByText(`New sharkname: ${rolled}. Save to keep it.`)).toBeInTheDocument();
    expect(handlePuts).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(`Saved. Your sharkname is ${rolled}.`)).toBeInTheDocument();
    expect(handlePuts).toEqual([{ handle: rolled }]);
  });

  it('flips through names before it lands when motion is allowed, and Generate waits for it', async () => {
    serve();
    const { container } = renderCard();
    const input = await field();
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(container.querySelector('.sn-plate')).toHaveAttribute('data-rolling', 'true');
    expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
    await waitFor(() => expect(container.querySelector('.sn-plate')).not.toHaveAttribute('data-rolling'));
    const landed = (input as HTMLInputElement).value;
    expect(landed).not.toBe('thirsty-sharkie');
    expect(isValidHandle(landed)).toBe(true);
    expect(container.querySelector('.sn-plate')).toHaveTextContent(landed);
    expect(screen.getByRole('button', { name: 'Generate' })).toBeEnabled();
  });

  it('keeps the plate still under reduced motion', () => {
    const css = readSheet();
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*{\s*\.sn-plate__name--flip,\s*\.sn-plate__name--land\s*{\s*animation: none;/);
  });

  it('offers another name when the one sent is taken', async () => {
    reducedMotion(true);
    const { handlePuts } = serve({ taken: ['fin-de-fiesta'] });
    renderCard();
    const input = await field();
    fireEvent.change(input, { target: { value: 'fin-de-fiesta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('fin-de-fiesta is taken.');
    const offer = within(alert).getByRole('button', { name: /^Try / });
    const suggestion = offer.textContent!.replace(/^Try /, '');
    expect(suggestion).not.toBe('fin-de-fiesta');
    expect(isValidHandle(suggestion) && hasSharkWord(suggestion)).toBe(true);

    fireEvent.click(offer);
    expect(input).toHaveValue(suggestion);
    expect(input).toHaveFocus();
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(`Saved. Your sharkname is ${suggestion}.`)).toBeInTheDocument();
    expect(handlePuts).toEqual([{ handle: 'fin-de-fiesta' }, { handle: suggestion }]);
  });

  it('refuses a name the database would refuse, without asking it', async () => {
    const { handlePuts } = serve();
    renderCard();
    const input = await field();
    fireEvent.change(input, { target: { value: 'no spaces-shark' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByRole('alert')).toHaveTextContent('3–32 letters, numbers, hyphens or underscores');
    expect(handlePuts).toEqual([]);
    // 32 characters fit; the field stops at 32.
    expect(input).toHaveAttribute('maxLength', '32');
  });

  it('says until when a recent sharkname is fixed, and offers no Generate meanwhile', async () => {
    serve({ handle: { canChangeAt: LATER } });
    renderCard();
    const input = await field();
    const date = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(LATER));
    expect(screen.getByText(`You can change your sharkname again on ${date}.`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
    expect(input).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('starts a learner without a sharkname at Generate, and opens what friends see once one is saved', async () => {
    reducedMotion(true);
    serve({ handle: { handle: null, canChangeAt: null } });
    renderCard();
    const input = await field();
    expect(input).toHaveValue('');
    expect(screen.getByText('No sharkname yet')).toBeInTheDocument();
    expect(screen.getByText('Save a sharkname first, then choose what friends see.')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    const rolled = (input as HTMLInputElement).value;
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('radio', { name: /Your sharkname/ })).toBeChecked();
    expect(screen.getByText(`Saved. Your sharkname is ${rolled}.`)).toBeInTheDocument();
  });

  it('puts the cursor in the field when the Friends tab sends the learner here', async () => {
    serve();
    const onFocused = vi.fn();
    renderCard({ focus: true, onFocused });
    const input = await field();
    await waitFor(() => expect(input).toHaveFocus());
    expect(onFocused).toHaveBeenCalledTimes(1);
  });

  it('says so and retries when the card cannot load', async () => {
    let fail = true;
    serve();
    server.use(http.get('*/api/user/identity', () => (fail
      ? HttpResponse.json({ error: { code: 'db_error', message: 'Could not load what friends see' } }, { status: 500 })
      : HttpResponse.json({ showRealName: false, showPhoto: false, ...ADA }))));
    renderCard();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Your sharkname couldn’t be loaded.');
    fail = false;
    fireEvent.click(within(alert).getByRole('button', { name: /retry/i }));
    expect(await field()).toHaveValue('thirsty-sharkie');
  });
});

describe('what friends see', () => {
  it('starts at the sharkname and initials, and switches to the name and photo', async () => {
    const { identityPuts } = serve();
    const { container } = renderCard();
    const sharkname = await screen.findByRole('radio', { name: /Your sharkname/ });
    expect(sharkname).toBeChecked();
    const preview = container.querySelector('.sn-preview')!;
    expect(preview).toHaveTextContent('Friends see you as');
    expect(preview.querySelector('.sn-preview__name')).toHaveTextContent('thirsty-sharkie');
    expect(preview.querySelector('.ss-initials-avatar')).toHaveTextContent('TS');

    fireEvent.click(screen.getByRole('radio', { name: /Your name/ }));
    await waitFor(() => expect(identityPuts).toEqual([{ showRealName: true }]));
    await waitFor(() => expect(screen.getByRole('radio', { name: /Your name/ })).toBeChecked());
    expect(preview.querySelector('.sn-preview__name')).toHaveTextContent('Ada Lovelace');
    expect(preview.querySelector('.ss-initials-avatar')).toHaveTextContent('AL');

    const photo = screen.getByRole('switch', { name: 'Show my photo to friends' });
    expect(photo).not.toBeChecked();
    fireEvent.click(photo);
    await waitFor(() => expect(identityPuts).toEqual([{ showRealName: true }, { showPhoto: true }]));
    await waitFor(() => expect(photo).toBeChecked());
    expect(preview.querySelector('.ss-initials-avatar')).toBeNull();
    expect(preview.querySelector('img')).toHaveAttribute('src', ADA.photo);
  });

  it('offers only the sharkname and initials to an account with no Google name or photo', async () => {
    serve({ identity: { realName: null, photo: null } });
    renderCard();
    const name = await screen.findByRole('radio', { name: /Your name/ });
    expect(name).toBeDisabled();
    expect(screen.getByText('Your account has no Google name.')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Show my photo to friends' })).toBeDisabled();
    expect(screen.getByText('Your account has no photo, so friends see your initials.')).toBeInTheDocument();
  });

  it('puts a switch back and says so when the save fails', async () => {
    const { identityPuts } = serve({ identityFails: true });
    renderCard();
    const photo = await screen.findByRole('switch', { name: 'Show my photo to friends' });
    fireEvent.click(photo);
    expect(await screen.findByRole('alert')).toHaveTextContent('That setting wasn’t saved. Try again.');
    expect(identityPuts).toEqual([{ showPhoto: true }]);
    await waitFor(() => expect(photo).not.toBeChecked());
  });
});

function readSheet(): string {
  return readFileSync(new URL('../src/components/SharknameCard.css', import.meta.url), 'utf8');
}
