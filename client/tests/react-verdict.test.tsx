import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { CodingWorkbench } from '../src/coding/CodingWorkbench';
import { submitCoding } from '../src/coding/api';
import type { CodingVerdictResponse } from '../../shared/coding-api';
import type { PlayableCodingTask } from '../../shared/coding-catalog';

vi.mock('../src/coding/Editor', () => ({ Editor: () => <textarea aria-label="Test editor" /> }));
vi.mock('../src/coding/api', () => ({ useCodingApproaches: () => ({data:undefined}), submitCoding: vi.fn(), revealCoding: vi.fn() }));
vi.mock('../src/coding/useReactHarness', () => {
  const run = {token:'local',status:'done',compileError:null,previewError:null,cases:[{name:'form submits',status:'fail',error:'local form event failed',durationMs:0}],logs:[],passed:0,failed:1,total:1,ran:true};
  const handle = {ready:true,run,start:async()=>run,reload:()=>{},iframeRef:()=>{},frameKey:0};
  return {HARNESS_URL:'/sandbox/index.html',useReactHarness:()=>handle};
});
const task: PlayableCodingTask = {
  id:'react-test',track:'react',level:1,tier:1,focus:['forms'],
  title:{en:'Test form',cs:'Test formuláře'},prompt:{en:'Submit',cs:'Odešli'},
  starter:'export default function App(){return null}',hints:{en:[],cs:[]},
  verify:'tests',estimatedMinutes:5,suite:'test("form submits",()=>{});',
};
function mount() {
  render(<MemoryRouter><LanguageProvider><CodingWorkbench task={task} initialCode={null} session="test-session" locked={null} signedIn mode="section" /></LanguageProvider></MemoryRouter>);
}
const result = (extra: Partial<CodingVerdictResponse>): CodingVerdictResponse => ({
  verdict:'passed',results:[{pass:true,actual:null,error:null}],hidden:null,check:null,logs:[],codeError:null,
  design:null,designReference:null,failureHint:null,puzzle:null,progress:null,firstPass:false,xpAwarded:0,applied:false,github:null,solutions:null,...extra,
});
it('shows the server React results after Submit instead of stale browser failures', async () => {
  vi.mocked(submitCoding).mockResolvedValue(result({}));
  mount();
  fireEvent.click(screen.getByRole('button',{name:'Submit'}));
  await waitFor(()=>expect(screen.getByRole('tab',{name:/Results/})).toHaveTextContent('1/1'));
  expect(screen.queryByText('local form event failed')).toBeNull();
  expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Test form');
  fireEvent.click(screen.getByRole('button',{name:'Run'}));
  await waitFor(()=>expect(screen.getByRole('tab',{name:/Results/})).toHaveTextContent('0/1'));
});
it('shows the server startup error so a learner can understand a failed submission', async () => {
  vi.mocked(submitCoding).mockResolvedValue(result({verdict:'error',results:[],codeError:'The React runner could not start. Try again in a moment.'}));
  mount();
  fireEvent.click(screen.getByRole('button',{name:'Submit'}));
  await waitFor(()=>expect(screen.getByText(/The React runner could not start/)).toBeVisible());
  expect(screen.queryByText('local form event failed')).toBeNull();
});
