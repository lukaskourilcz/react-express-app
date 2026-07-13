import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from '../theme';
import { useColorMode } from './colorMode';

// Resolve the active palette from the user's chosen mode, falling back to the
// OS light/dark setting when the mode is 'system'.
export function useColors(): ThemeColors {
  const os = useColorScheme();
  const mode = useColorMode();
  const dark = mode === 'system' ? os === 'dark' : mode === 'dark';
  return dark ? darkColors : lightColors;
}

/** True when the resolved palette is dark — for status bar / icon choices. */
export function useIsDark(): boolean {
  const os = useColorScheme();
  const mode = useColorMode();
  return mode === 'system' ? os === 'dark' : mode === 'dark';
}
