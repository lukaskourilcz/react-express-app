import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/useColors';
import { useAuth } from '../lib/auth';
import { PrimaryButton } from '../components/ui';

export default function AccountScreen() {
  const c = useColors();
  const { user, isAuthenticated, isLoading, signInWithGoogle, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      Alert.alert('Sign-in failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: c.background }]}>
      <Text style={[styles.h1, { color: c.text }]}>Account</Text>
      {isAuthenticated ? (
        <View style={styles.center}>
          <Text style={{ color: c.textSecondary, marginBottom: 4 }}>Signed in as</Text>
          <Text style={{ color: c.text, fontWeight: '700', marginBottom: 24 }}>
            {user?.email ?? user?.user_metadata?.name ?? user?.id}
          </Text>
          <PrimaryButton label="Sign out" onPress={signOut} />
        </View>
      ) : (
        <View style={styles.center}>
          <Text style={{ color: c.textSecondary, textAlign: 'center', marginBottom: 24, paddingHorizontal: 24 }}>
            Sign in to save your stats and appear on the leaderboard.
          </Text>
          <PrimaryButton
            label="Continue with Google"
            onPress={handleSignIn}
            loading={busy || isLoading}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 24, fontWeight: '800', marginBottom: 24 },
});
