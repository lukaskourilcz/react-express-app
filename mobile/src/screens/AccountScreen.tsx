import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/useColors';
import { useAuth } from '../lib/auth';
import { fetchUserStats, type UserStats } from '../lib/userApi';
import { useT, setLang, type Lang } from '../lib/i18n';
import { PrimaryButton, Card } from '../components/ui';

export default function AccountScreen() {
  const c = useColors();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, signInWithGoogle, signOut } = useAuth();
  const { t, lang } = useT();
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setStats(null);
      return;
    }
    fetchUserStats()
      .then((r) => setStats(r.data))
      .catch(() => setStats(null));
  }, [isAuthenticated]);

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

  const accuracy =
    stats && stats.total_questions > 0 ? Math.round((stats.total_correct / stats.total_questions) * 100) : 0;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.h1, { color: c.text }]}>{t('account.title')}</Text>

        {isAuthenticated ? (
          <>
            <Text style={{ color: c.textSecondary }}>{t('account.signedInAs')}</Text>
            <Text style={{ color: c.text, fontWeight: '700', marginBottom: 16 }}>
              {user?.email ?? user?.user_metadata?.name ?? user?.id}
            </Text>

            {stats && (
              <View style={styles.statsGrid}>
                <Stat c={c} label={t('account.quizzes')} value={String(stats.total_quizzes)} />
                <Stat c={c} label={t('account.accuracy')} value={`${accuracy}%`} />
                <Stat c={c} label={t('account.streak')} value={String(stats.current_streak)} />
                <Stat c={c} label={t('account.best')} value={String(stats.longest_streak)} />
              </View>
            )}

            <Pressable onPress={() => router.push('/flashcards')}>
              <Card style={styles.row}>
                <Ionicons name="bookmark-outline" size={20} color={c.brand} />
                <Text style={{ color: c.text, fontWeight: '600', flex: 1 }}>{t('account.savedCards')}</Text>
                <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
              </Card>
            </Pressable>
          </>
        ) : (
          <View style={{ marginVertical: 24 }}>
            <Text style={{ color: c.textSecondary, marginBottom: 16 }}>{t('account.signInPrompt')}</Text>
            <PrimaryButton label={t('account.signInGoogle')} onPress={handleSignIn} loading={busy || isLoading} />
          </View>
        )}

        {/* Language toggle */}
        <Text style={[styles.section, { color: c.textSecondary }]}>{t('account.language')}</Text>
        <View style={styles.langRow}>
          {(['en', 'cs'] as Lang[]).map((l) => {
            const selected = lang === l;
            return (
              <Pressable
                key={l}
                onPress={() => void setLang(l)}
                style={[styles.langBtn, { borderColor: selected ? c.brand : c.border, backgroundColor: selected ? c.brand : c.card }]}
              >
                <Text style={{ color: selected ? '#fff' : c.textSecondary, fontWeight: '700' }}>
                  {l === 'en' ? 'English' : 'Čeština'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isAuthenticated && (
          <Pressable onPress={signOut} style={{ marginTop: 28 }}>
            <Text style={{ color: c.error, fontWeight: '700' }}>{t('account.signOut')}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ c, label, value }: { c: ReturnType<typeof useColors>; label: string; value: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={{ color: c.text, fontWeight: '800', fontSize: 22 }}>{value}</Text>
      <Text style={{ color: c.textSecondary, fontSize: 13 }}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: 20 },
  h1: { fontSize: 28, fontWeight: '800', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  stat: { flexBasis: '47%', flexGrow: 1, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  section: { marginTop: 24, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, borderWidth: 2 },
});
