import type { EvolvingChallenge } from './evolving';

/** Transport only: responses are produced by the learner's own handler.
 * No network, backend solution, persistent data or privileged APIs here. */
export const LOCAL_FETCH_SOURCE = `export function createLocalFetch(handler) {
 return async function fetch(url, options = {}) {
  let body;
  try { body = options.body === undefined ? undefined : JSON.parse(options.body); }
  catch { return {ok:false,status:400,json:async()=>({error:'invalid'})}; }
  const result = await handler({method: options.method || 'GET', path:String(url), body});
  const snapshot = JSON.stringify(result.body);
  return {ok:result.status>=200&&result.status<300,status:result.status,json:async()=>JSON.parse(snapshot)};
 };
}`;

export const FULLSTACK_REACT_SCAFFOLD = `
import React, {useState, useEffect} from 'react';
import {createLocalFetch} from './localFetch';
export {normalizeInput, updateItem, createApi};
export default function App({fetcher}) {
  // Keep one createLocalFetch(createApi(seed)) per mounted app when fetcher is absent.
  // Implement the current stage here; your API code above remains yours.
  return <main />;
}
`;

export function prepareEvolvingDraft(code: string, challenge: EvolvingChallenge | undefined, stageIndex: number): string {
  // Only append at the first React stage. Never rewrite an existing stage draft.
  if (challenge?.category !== 'fullstack') return code;
  return stageIndex === challenge.stages.findIndex(id => id.startsWith('react-')) ? code + FULLSTACK_REACT_SCAFFOLD : code;
}
