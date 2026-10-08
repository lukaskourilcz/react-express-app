import { afterEach, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useReactHarness } from '../src/coding/useReactHarness';

afterEach(() => vi.useRealTimers());

function mountHarness() {
  const hook = renderHook(() => useReactHarness());
  const frame = document.createElement('iframe');
  document.body.append(frame);
  act(() => hook.result.current.iframeRef(frame));
  const message = (data: unknown) => act(() => {
    window.dispatchEvent(new MessageEvent('message', {source: frame.contentWindow, data}));
  });
  return {...hook, frame, message};
}

it('settles a pending run when the sandbox is restarted', async () => {
  vi.useFakeTimers();
  const h = mountHarness();
  h.message({type:'ready'});
  let run!: ReturnType<typeof h.result.current.start>;
  await act(async () => { run = h.result.current.start({}, {tests:true, preview:true}); });
  act(() => h.result.current.reload());
  let settled = false;
  void run.then(() => {settled = true;});
  await act(async () => {await vi.advanceTimersByTimeAsync(21_000);});
  expect(settled).toBe(true);
  expect((await run).status).toBe('timeout');
  h.frame.remove();
});

it('cancels readiness waits on restart and never posts an obsolete run', async () => {
  vi.useFakeTimers();
  const h = mountHarness();
  const post = vi.spyOn(h.frame.contentWindow!, 'postMessage');
  let run!: ReturnType<typeof h.result.current.start>;
  act(() => {run = h.result.current.start({}, {tests:true, preview:true});});
  act(() => h.result.current.reload());
  h.message({type:'ready'});
  await act(async () => {await vi.advanceTimersByTimeAsync(21_000);});
  expect((await run).status).toBe('timeout');
  expect(post).not.toHaveBeenCalled();
  h.frame.remove();
});

it('settles runs on unmount and ignores messages from other frames', async () => {
  vi.useFakeTimers();
  const h = mountHarness();
  h.message({type:'ready'});
  let run!: ReturnType<typeof h.result.current.start>;
  await act(async () => {run = h.result.current.start({}, {tests:true, preview:true});});
  const token = h.result.current.run!.token;
  act(() => window.dispatchEvent(new MessageEvent('message', {data:{type:'done',token,passed:1,total:1}})));
  expect(h.result.current.run?.status).toBe('running');
  h.unmount();
  let settled = false;
  void run.then(() => {settled = true;});
  await act(async () => {await vi.advanceTimersByTimeAsync(1);});
  expect(settled).toBe(true);
  h.frame.remove();
});

// Audit C3-2: the frame posts compile-error and then an empty done. The done
// replaced the error, so a build error read "0 of 0 passing".
it('keeps a build error when the frame closes the run with an empty done', async () => {
  const h = mountHarness();
  h.message({type:'ready'});
  let run!: ReturnType<typeof h.result.current.start>;
  await act(async () => {run = h.result.current.start({}, {tests:true, preview:true});});
  const token = h.result.current.run!.token;
  h.message({type:'compile-error', token, message:"Unexpected token, expected ';'"});
  h.message({type:'done', token, passed:0, failed:0, total:0});
  expect((await run).status).toBe('compile-error');
  expect(h.result.current.run).toMatchObject({status:'compile-error', compileError:"Unexpected token, expected ';'"});
  h.unmount();
  h.frame.remove();
});
