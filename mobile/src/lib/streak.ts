// Daily streak + activity "garden" (Duolingo-/GitHub-style). Every completed
// lesson marks today active; the current streak is the run of consecutive active
// days ending today (or yesterday, so it doesn't break until a full day is
// missed). The same data is pushed to the iOS home-screen widget.
import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from './api';
import { updateWidget } from './widget';

const KEY = 'devquiz:streak:v1';
const STREAK_API = '/api/user/streak';
export const GARDEN_DAYS = 119; // 17 weeks × 7 for the widget/garden grid

export interface StreakState {
  /** date (YYYY-MM-DD, local) → number of lessons completed that day. */
  days: Record<string, number>;
}

export interface GardenDay {
  date: string;
  count: number;
}

let cache: StreakState = { days: {} };
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function currentStreak(days: Record<string, number>): number {
  let streak = 0;
  let d = new Date();
  // Today may still be in progress, so start counting from yesterday if today
  // has no activity yet.
  if (!days[dayKey(d)]) d = addDays(d, -1);
  while (days[dayKey(d)]) {
    streak += 1;
    d = addDays(d, -1);
  }
  return streak;
}

export function longestStreak(days: Record<string, number>): number {
  const keys = Object.keys(days).filter((k) => days[k] > 0).sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const d = new Date(`${k}T00:00:00`);
    if (prev && dayKey(addDays(prev, 1)) === k) run += 1;
    else run = 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** The last GARDEN_DAYS days (oldest → newest) for the contribution grid. */
export function buildGarden(days: Record<string, number>): GardenDay[] {
  const out: GardenDay[] = [];
  const today = new Date();
  for (let i = GARDEN_DAYS - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const k = dayKey(d);
    out.push({ date: k, count: days[k] ?? 0 });
  }
  return out;
}

async function persist() {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // best effort
  }
}

function pushToWidget() {
  updateWidget({
    current: currentStreak(cache.days),
    longest: longestStreak(cache.days),
    days: buildGarden(cache.days),
    updatedAt: new Date().toISOString(),
  });
}

export async function loadStreak(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as StreakState) : { days: {} };
  } catch {
    cache = { days: {} };
  }
  loaded = true;
  emit();
  pushToWidget();
}

/** Mark today active (call when a lesson or checkpoint is completed). */
export async function recordActivityToday(): Promise<void> {
  const k = dayKey(new Date());
  cache = { days: { ...cache.days, [k]: (cache.days[k] ?? 0) + 1 } };
  await persist();
  emit();
  pushToWidget();
  void pushStreak();
}

/* ──── account sync (cross-device, via /api/user/streak) ────────────────── */

export async function pushStreak(): Promise<void> {
  try {
    await apiFetch(STREAK_API, { method: 'PUT', body: JSON.stringify({ days: cache.days }) });
  } catch {
    // not signed in / offline — local + widget stay the source of truth
  }
}

/** On sign-in: pull the account's activity, merge (max per day), store + push. */
export async function syncStreakWithServer(): Promise<void> {
  let serverDays: Record<string, number> = {};
  try {
    const { data } = await apiFetch<{ data: { days: Record<string, number> } }>(STREAK_API);
    serverDays = data?.days ?? {};
  } catch {
    return;
  }
  const merged = { ...cache.days };
  for (const [k, v] of Object.entries(serverDays)) merged[k] = Math.max(merged[k] ?? 0, v);
  cache = { days: merged };
  await persist();
  emit();
  pushToWidget();
  await pushStreak();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export interface StreakSummary {
  current: number;
  longest: number;
  garden: GardenDay[];
  activeToday: boolean;
}

export function useStreak(): StreakSummary {
  useEffect(() => {
    if (!loaded) void loadStreak();
  }, []);
  const state = useSyncExternalStore(subscribe, () => cache);
  return {
    current: currentStreak(state.days),
    longest: longestStreak(state.days),
    garden: buildGarden(state.days),
    activeToday: (state.days[dayKey(new Date())] ?? 0) > 0,
  };
}
