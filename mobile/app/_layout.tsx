import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/lib/auth';
import { initGameState } from '../src/lib/gameState';
import { loadLang } from '../src/lib/i18n';
import { XpToaster } from '../src/components/XpToaster';

export default function RootLayout() {
  // Hydrate the synchronous storage facade (wallet, inventory, XP, settings, …)
  // and the language preference once, before the first screen reads them.
  useEffect(() => {
    void initGameState();
    void loadLang();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
        <XpToaster />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
