// Local Expo module that bridges JS → the shared App Group so the Home Screen
// widget can read the streak/garden snapshot. Resolved optionally elsewhere
// (src/lib/widget.ts) so the app still runs where the native module is absent
// (Expo Go / web).
import { requireOptionalNativeModule } from 'expo-modules-core';

export default requireOptionalNativeModule('DevquizWidget');
