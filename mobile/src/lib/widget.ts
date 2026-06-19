// Bridge to the iOS home-screen widget. The streak/garden snapshot is written to
// the shared App Group (group.<bundleId>) as JSON; the SwiftUI WidgetKit
// extension (targets/widget) reads the same key and renders the garden + streak.
//
// The native module only exists in a dev/EAS build (not Expo Go or web), so we
// resolve it optionally and no-op when it's missing — the app still works, the
// widget just won't update until you run a native build.
import { requireOptionalNativeModule } from 'expo-modules-core';
import type { GardenDay } from './streak';

export const APP_GROUP_KEY = 'garden';

export interface GardenPayload {
  current: number;
  longest: number;
  days: GardenDay[];
  updatedAt: string;
}

interface WidgetNativeModule {
  setGardenData(json: string): void;
  reload(): void;
}

const native = requireOptionalNativeModule<WidgetNativeModule>('DevquizWidget');

export function isWidgetSupported(): boolean {
  return native != null;
}

export function updateWidget(payload: GardenPayload): void {
  if (!native) return;
  try {
    native.setGardenData(JSON.stringify(payload));
    native.reload();
  } catch {
    // ignore — widget refresh is best-effort
  }
}
