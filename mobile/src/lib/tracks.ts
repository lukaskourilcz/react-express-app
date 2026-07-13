// Learning track (Frontend / Backend / Full-Stack) — a light flavour applied to
// the career-rank title, mirroring the web client. Persisted locally.
import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';
import type { Specialization } from './leveling';

export type Track = 'frontend' | 'backend' | 'fullstack' | null;

const KEY = 'devquiz:track';

const read = (): Track => {
  const v = readJSON<string | null>(KEY, null);
  return v === 'frontend' || v === 'backend' || v === 'fullstack' ? v : null;
};

const store = createStore<Track>(read);

export function getTrack(): Track {
  return read();
}
export function useTrack(): Track {
  return useStore(store);
}
export function setTrack(next: Track): void {
  writeJSON(KEY, next);
  store.emit();
}

/** Map a track to the display specialization used in career titles. */
export function specializationForTrack(track: Track): Specialization | null {
  if (track === 'frontend') return 'Frontend';
  if (track === 'backend') return 'Backend';
  if (track === 'fullstack') return 'Full-Stack';
  return null;
}
