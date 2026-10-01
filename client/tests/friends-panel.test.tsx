import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { FriendsPanel } from '../src/components/FriendsPanel';
import { avatarTone, initialsFor } from '../src/components/ui/InitialsAvatar';
import { server } from './mocks/server';

// The Friends tab shows each friend by the name they chose for friends
// (migration 055): their sharkname, or their Google name, followed by the
// sharkname when the two differ. The avatar is their photo only when they
// switched it on, and their initials otherwise.

const friend = (over: Record<string, unknown>) => ({
  handle: 'x', displayName: 'x', picture: null, country: null, crown: false,
  currentStreak: 0, longestStreak: 0, totalCorrect: 0, totalQuestions: 0, accuracyPct: 0, activeToday: false,
  ...over,
});

function serve(options: { handle?: string | null; friends?: unknown[]; requests?: unknown[]; lookup?: unknown } = {}) {
  const answered: unknown[] = [];
  server.use(
    http.get('*/api/user/friends-handle', () => HttpResponse.json({
      handle: options.handle === undefined ? 'thirsty-sharkie' : options.handle,
      discoverable: true, country: null, canChangeAt: null,
    })),
    http.get('*/api/user/friends-list', () => HttpResponse.json({ friends: options.friends ?? [], requests: options.requests ?? [] })),
    http.get('*/api/user/friends-lookup', () => HttpResponse.json(options.lookup ?? { found: false })),
    http.post('*/api/user/friends-respond', async ({ request }) => {
      answered.push(await request.json());
      return HttpResponse.json({ state: 'accepted' });
    }),
  );
  return { answered };
}

const renderPanel = (onEditSharkname?: () => void) =>
  render(<LanguageProvider><FriendsPanel onEditSharkname={onEditSharkname} /></LanguageProvider>);

describe('the friends list', () => {
  it('names each friend as they chose, with initials unless they show their photo', async () => {
    serve({
      friends: [
        friend({ handle: 'el-tiburon-loco', displayName: 'Ada Lovelace', picture: 'https://lh3.googleusercontent.com/a/ada', totalQuestions: 10, accuracyPct: 80 }),
        friend({ handle: 'fin-de-fiesta', displayName: 'fin-de-fiesta', picture: null }),
      ],
    });
    renderPanel();
    const list = await screen.findByRole('heading', { name: 'Friends (2)' });
    const rows = within(list.closest('section')!).getAllByRole('listitem');

    // Ada shows her name and her photo; her sharkname follows, for finding her.
    expect(rows[0].querySelector('.fr-friend__name')).toHaveTextContent('Ada Lovelaceel-tiburon-loco');
    expect(rows[0].querySelector('img')).toHaveAttribute('src', 'https://lh3.googleusercontent.com/a/ada');
    expect(rows[0].querySelector('.ss-initials-avatar')).toBeNull();

    // The second friend shows the sharkname once, and initials.
    expect(rows[1].querySelector('.fr-friend__name')).toHaveTextContent(/^fin-de-fiesta$/);
    const initials = rows[1].querySelector('.ss-initials-avatar')!;
    expect(initials).toHaveTextContent('FD');
    expect(initials).toHaveAttribute('data-tone', String(avatarTone('fin-de-fiesta')));
    // The name is written beside it, so the avatar is not read out again.
    expect(initials).toHaveAttribute('aria-hidden', 'true');

    expect(screen.getByRole('button', { name: 'Remove Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove fin-de-fiesta' })).toBeInTheDocument();
  });

  it('shows who asked by the name they chose, and answers by their sharkname', async () => {
    const { answered } = serve({
      requests: [
        { handle: 'mucho-chomp-shark', displayName: 'Dee Example', direction: 'incoming' },
        { handle: 'gracias-sharkie', displayName: 'gracias-sharkie', direction: 'outgoing' },
      ],
    });
    renderPanel();
    const accept = await screen.findByRole('button', { name: 'Accept Dee Example' });
    expect(screen.getByRole('button', { name: 'Decline Dee Example' })).toBeInTheDocument();
    expect(screen.getByText('Dee Example')).toBeInTheDocument();
    expect(screen.getByText('mucho-chomp-shark')).toBeInTheDocument();
    expect(screen.getByText('gracias-sharkie')).toBeInTheDocument();
    fireEvent.click(accept);
    await waitFor(() => expect(answered).toEqual([{ handle: 'mucho-chomp-shark', accept: true }]));
  });

  it('shows an accepted friend’s chosen name when their sharkname is looked up', async () => {
    serve({ lookup: { found: true, handle: 'el-tiburon-loco', state: 'accepted', displayName: 'Ada Lovelace' } });
    renderPanel();
    const input = await screen.findByRole('textbox', { name: 'Add a friend' });
    expect(input).toHaveAttribute('maxLength', '32');
    fireEvent.change(input, { target: { value: 'el-tiburon-loco' } });
    fireEvent.click(screen.getByRole('button', { name: 'Look up' }));
    const result = await screen.findByText('Already friends.');
    expect(result.closest('.fr-result')).toHaveTextContent('Ada Lovelaceel-tiburon-loco');
  });
});

describe('your sharkname on the Friends tab', () => {
  it('says what friends add you by, and sends you to the Overview card to change it', async () => {
    serve();
    const edit = vi.fn();
    renderPanel(edit);
    expect(await screen.findByText('Friends add you by your sharkname, thirsty-sharkie.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change sharkname' }));
    expect(edit).toHaveBeenCalledTimes(1);
  });

  it('asks a learner without one to pick a sharkname first', async () => {
    serve({ handle: null });
    const edit = vi.fn();
    renderPanel(edit);
    expect(await screen.findByText('You have no sharkname yet, so nobody can add you.')).toBeInTheDocument();
    expect(screen.getByText('Pick a sharkname first, then add someone by theirs.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Add a friend' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Pick a sharkname' }));
    expect(edit).toHaveBeenCalledTimes(1);
  });
});

describe('initials', () => {
  it('takes the first letters of the first two words of a name or a sharkname', () => {
    expect(initialsFor('Ada Lovelace')).toBe('AL');
    expect(initialsFor('thirsty-sharkie')).toBe('TS');
    expect(initialsFor('shark-so-fat-it-cant-swim')).toBe('SS');
    expect(initialsFor('Madonna')).toBe('M');
    expect(initialsFor('  ')).toBe('?');
    expect(initialsFor('élodie dupont')).toBe('ÉD');
  });

  it('gives a name one of eight inks, the same every time', () => {
    const tones = ['Ada Lovelace', 'thirsty-sharkie', 'fin-de-fiesta', 'el-tiburon-loco', 'mucho-chomp-shark', 'Dee Example']
      .map(avatarTone);
    for (const tone of tones) expect(tone).toBeGreaterThanOrEqual(1);
    for (const tone of tones) expect(tone).toBeLessThanOrEqual(8);
    expect(avatarTone('Ada Lovelace')).toBe(avatarTone('ada lovelace '));
    expect(new Set(tones).size).toBeGreaterThan(1);
  });
});
