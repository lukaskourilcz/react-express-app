import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from '../theme';

// Resolve the active palette from the OS light/dark setting.
export function useColors(): ThemeColors {
  return useColorScheme() === 'dark' ? darkColors : lightColors;
}
