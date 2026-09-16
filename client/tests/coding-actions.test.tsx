import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { CodingWorkbench } from '../src/coding/CodingWorkbench';
import LoadingScreen from '../src/components/LoadingScreen';
import type { PlayableCodingTask } from '../../shared/coding-catalog';
import { FULLSTACK_REACT_SCAFFOLD, prepareEvolvingDraft } from '../../shared/coding-fullstack-support';
import { EVOLVING_CHALLENGES, evolvingTaskTrack } from '../../shared/evolving';
import { formatCode } from '../src/coding/runner/format';
import { FinButton } from '../src/components/landing/LandingKit';
import { generateFinHover } from '../src/lib/finHover';

vi.mock('../src/coding/Editor', () => ({
  Editor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) =>
    <textarea aria-label="Test editor" value={value} onChange={event => onChange(event.target.value)} />,
}));
vi.mock('../src/coding/api', () => ({ useCodingApproaches: () => ({ data: undefined }), submitCoding: vi.fn(), revealCoding: vi.fn() }));

const task: PlayableCodingTask = {
  id: 'js-test-editor', track: 'javascript', level: 1, tier: 1,
  focus: ['functions'], title: { en: 'Test task', cs: 'Testovací úloha' },
  prompt: { en: 'Return one.', cs: 'Vrať jedničku.' },
  starter: 'const one = () => 1;\n', hints: { en: ['Use a function.'], cs: ['Použij funkci.'] },
  verify: 'tests', estimatedMinutes: 5, tests: [],
};
function mount(onDraft = vi.fn()) {
  return { onDraft, ...render(<MemoryRouter><LanguageProvider><CodingWorkbench initialCode={null} task={task} session={null} locked={null} signedIn={false} mode="section" onDraft={onDraft} /></LanguageProvider></MemoryRouter>) };
}

it('disables idle/empty formatting and enables it only for a real formatting change', async () => {
  mount();
  expect(screen.getByRole('button', {name:'Hint'})).toBeInTheDocument();
  const format = screen.getByRole('button', { name: 'Format' });
  expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  expect(format).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Test editor'), { target: { value: 'const one=()=>2' } });
  await waitFor(() => expect(format).toBeEnabled(), { timeout: 5000 });
  fireEvent.click(format);
  await waitFor(() => expect(screen.getByLabelText('Test editor')).toHaveValue('const one = () => 2;\n'));
  await waitFor(() => expect(format).toBeDisabled());
  fireEvent.change(screen.getByLabelText('Test editor'), { target: { value: '   ' } });
  expect(format).toBeDisabled();
});

it('Reset clears exhausted hints even when the code is unchanged', async () => {
  localStorage.setItem('devshark:coding:hints:js-test-editor', '20');
  mount();
  expect(screen.queryByText('Use a function.')).toBeNull();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000);
  fireEvent.change(screen.getByLabelText('Test editor'), {target:{value:'const one = () => 2;'}});
  fireEvent.click(screen.getByRole('button',{name:'Hint'}));
  expect(screen.getByText('Use a function.')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Next hint'}));
  clock.mockRestore();
  fireEvent.change(screen.getByLabelText('Test editor'), {target:{value:task.starter}});
  const reset = screen.getByRole('button', { name: 'Reset' });
  expect(reset).toBeEnabled();
  fireEvent.click(reset);
  const dialog = screen.getByRole('alertdialog', { name: 'Reset' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Reset' }));
  await waitFor(() => expect(screen.queryByText('Use a function.')).toBeNull());
  expect(screen.getByRole('button',{name:'Hint'})).toBeInTheDocument();
  expect(reset).toBeDisabled();
});

it('flushes edits when leaving before the draft debounce finishes', () => {
  const { unmount, onDraft } = mount();
  fireEvent.change(screen.getByLabelText('Test editor'), { target: { value: 'const one = () => 3;' } });
  unmount();
  expect(onDraft).toHaveBeenCalledWith('const one = () => 3;');
});

it('uses a visible, accessible branded loading status', () => {
  render(<LoadingScreen label="Loading task…" />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading task…');
  expect(screen.getByText('Loading task…')).toBeVisible();
});

it('groups all learning controls below the editor with revealed hints after the bar', () => {
  localStorage.setItem('devshark:coding:hints:js-test-editor', '1');
  render(<MemoryRouter><LanguageProvider><CodingWorkbench initialCode={null} task={task} session="test-session" locked={null} signedIn mode="section" /></LanguageProvider></MemoryRouter>);
  expect(screen.queryByText('Use a function.')).toBeNull();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000);
  fireEvent.change(screen.getByLabelText('Test editor'), {target:{value:'const one = () => 2;'}});
  fireEvent.click(screen.getByRole('button',{name:'Hint'}));
  clock.mockRestore();
  const run = screen.getByRole('button',{name:'Run'});
  const bar = run.closest('.cd-editor-actions')!;
  expect(within(bar as HTMLElement).getByRole('button',{name:'Solution'})).toBeInTheDocument();
  expect(within(bar as HTMLElement).getByRole('button',{name:'Next hint'})).toBeInTheDocument();
  expect(within(bar as HTMLElement).getByRole('button',{name:'Focus'})).toHaveAttribute('aria-pressed','false');
  expect(within(bar as HTMLElement).getByRole('button',{name:/Skip/i})).toBeInTheDocument();
  const hint = screen.getByText('Use a function.');
  expect(hint.closest('li')).toBeInTheDocument();
  expect(bar.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(run.closest('.cd-pane--task')).toBeNull();
  const grid = bar.closest('.cd-workbench__grid')!;
  expect(grid.querySelector('.cd-pane--task')).toBeNull();
  expect(grid.querySelector('.cd-pane--editor')?.parentElement).toBe(grid);
  expect(grid.querySelector('.cd-pane--output')?.parentElement).toBe(grid);
  expect(screen.getByRole('button',{name:/Report a problem/}).closest('.cd-actions--utility')).toBeInTheDocument();
});

it('keeps FullStack routes on real graders and preserves code across the React transition', () => {
  for (const project of EVOLVING_CHALLENGES.filter(p=>p.category==='fullstack')) {
    expect(project.stages).toHaveLength(12);
    expect(project.stages.map(evolvingTaskTrack)).toEqual(['javascript','typescript','typescript','typescript','typescript','react','react','react','react','react','react','react']);
  }
  const saved = 'function normalizeInput(value) { return null; }';
  const fullstack = EVOLVING_CHALLENGES.find(p=>p.category==='fullstack')!;
  const single = EVOLVING_CHALLENGES.find(p=>p.id==='js-evolving-calculator')!;
  const standalone = EVOLVING_CHALLENGES.find(p=>p.standalone)!;
  expect(prepareEvolvingDraft(saved,fullstack,5)).toBe(saved+FULLSTACK_REACT_SCAFFOLD);
  expect(prepareEvolvingDraft(saved,fullstack,6)).toBe(saved);
  expect(prepareEvolvingDraft(saved,single,4)).toBe(saved);
  // A standalone challenge seeds nothing: every stage opens on its own starter.
  expect(prepareEvolvingDraft(saved,standalone,1)).toBeNull();
});

it('formats TSX without discarding TypeScript annotations', async () => {
  const formatted=await formatCode('type Item={name:string};export default function App(){return <p>Hello</p>}', 'react');
  expect(formatted).toContain('type Item = { name: string };');
  expect(formatted).toContain('<p>Hello</p>');
});

it('places authored stage links inside Resources, away from the task brief', () => {
  const reference={title:{en:'Addition and numeric operators',cs:'Sčítání a číselné operátory'},url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_operators#arithmetic_operators'};
  render(<MemoryRouter><LanguageProvider><CodingWorkbench initialCode={null} task={{...task,references:[reference]}} session={null} locked={null} signedIn={false} mode="section" /></LanguageProvider></MemoryRouter>);
  expect(screen.queryByRole('heading',{name:'Stage references'})).toBeNull();
  fireEvent.click(screen.getByRole('tab',{name:/Resources/}));
  const link=screen.getByRole('link',{name:reference.title.en});
  expect(link).toHaveAttribute('href',reference.url);
  expect(link.closest('[role="tabpanel"]')).toBeInTheDocument();
  expect(link.closest('.cd-pane--task')).toBeNull();
});

it('keeps a randomized fin stable across button updates without changing its accessible name', () => {
  const {rerender}=render(<FinButton onClick={()=>{}}>Continue</FinButton>);
  const button=screen.getByRole('button',{name:'Continue'});
  const profile=button.getAttribute('style');
  rerender(<FinButton disabled>Continue</FinButton>);
  expect(button).toHaveAttribute('style',profile);
  expect(button).toBeDisabled();
  expect(button.querySelector('.ss-fin-hover')).toHaveAttribute('aria-hidden','true');
  const gentle=generateFinHover(()=>0);
  const fast=generateFinHover(()=>0.99);
  expect(gentle.direction).not.toBe(fast.direction);
  expect(gentle.motion).not.toBe(fast.motion);
  expect(gentle.shade).not.toBe(fast.shade);
  expect(gentle.duration).not.toBe(fast.duration);
});
