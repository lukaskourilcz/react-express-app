import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/useColors';
import { useAuth } from '../lib/auth';
import { fetchUserStats, type UserStats } from '../lib/userApi';
import { useT } from '../lib/i18n';
import { useLevelInfo } from '../lib/xp';
import { useTokens } from '../lib/tokens';
import { useEquippedRingColor, useEquippedFlair } from '../lib/shop';
import { displayTitle } from '../lib/leveling';
import { useTrack, specializationForTrack } from '../lib/tracks';
import { computeAchievements, readPerfectQuizCount } from '../lib/achievements';
import { useBookmarks } from '../lib/bookmarks';
import { syncXpWithServer } from '../lib/xp';
import { syncProgressWithServer } from '../lib/roadmapProgress';
import { grantRegistrationBonusIfNew, SIGNUP_BONUS_TOKENS } from '../lib/tokens';
import { PrimaryButton, Card } from '../components/ui';
import { SharkFin } from '../components/SharkFin';

export default function AccountScreen() {
  const c = useColors();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, signInWithGoogle, signOut } = useAuth();
  const { t } = useT();
  const info = useLevelInfo();
  const tokens = useTokens();
  const ringColor = useEquippedRingColor();
  const flair = useEquippedFlair();
  const track = useTrack();
  const bookmarks = useBookmarks();
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setStats(null);
      return;
    }
    fetchUserStats().then((r) => setStats(r.data)).catch(() => setStats(null));
    void syncXpWithServer();
    void syncProgressWithServer();
    if (user) {
      void grantRegistrationBonusIfNew(user).then((granted) => {
        if (granted) Alert.alert('devShark', `+${SIGNUP_BONUS_TOKENS} tokens · welcome!`);
      });
    }
  }, [isAuthenticated, user]);

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

  const accuracy = stats && stats.total_questions > 0 ? Math.round((stats.total_correct / stats.total_questions) * 100) : 0;
  const rankTitle = displayTitle(info.rank.title, specializationForTrack(track));
  const name = user?.user_metadata?.name ?? user?.email ?? user?.id ?? '';
  const achievements = computeAchievements({
    stats: stats as never,
    bookmarkCount: bookmarks.questions.length,
    perfectQuizzes: readPerfectQuizCount(),
  });
  const earnedCount = achievements.filter((a) => a.earned).length;

  const menu: { icon: keyof typeof Ionicons.glyphMap; label: string; route: Href }[] = [
    { icon: 'home-outline', label: t('account.menu.home'), route: '/home' as Href },
    { icon: 'bag-outline', label: t('account.menu.shop'), route: '/shop' as Href },
    { icon: 'flash-outline', label: t('account.menu.challenge'), route: '/challenge' as Href },
    { icon: 'bookmark-outline', label: t('account.menu.cards'), route: '/flashcards' as Href },
    { icon: 'settings-outline', label: t('account.menu.settings'), route: '/settings' as Href },
  ];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        {isAuthenticated ? (
          <>
            {/* Identity */}
            <View style={styles.identity}>
              <View style={[styles.avatar, { backgroundColor: c.brandSoft, borderColor: ringColor ?? c.border, borderWidth: ringColor ? 3 : 1 }]}>
                <Text style={{ fontSize: 26 }}>{flair ?? '🦈'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: '800', fontSize: 18 }} numberOfLines={1}>{name}</Text>
                <Text style={{ color: c.textSecondary }} numberOfLines={1}>{user?.email ?? ''}</Text>
              </View>
              <View style={[styles.tokenPill, { backgroundColor: c.gold + '22' }]}>
                <Ionicons name="server-outline" size={13} color={c.goldDark} />
                <Text style={{ color: c.goldDark, fontWeight: '800' }}>{tokens}</Text>
              </View>
            </View>

            {/* Career card */}
            <Card style={{ marginTop: 16 }}>
              <View style={styles.rankRow}>
                <Text style={{ fontSize: 30 }}>{info.rank.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: '800', fontSize: 16 }}>{rankTitle}</Text>
                  <Text style={{ color: c.textSecondary, fontSize: 13 }}>
                    Level {info.level} · {info.totalXp} XP
                  </Text>
                </View>
              </View>
              <View style={[styles.xpTrack, { backgroundColor: c.border }]}>
                <View style={{ width: `${info.progressPct}%`, height: '100%', backgroundColor: c.brand, borderRadius: 4 }} />
              </View>
              <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 6 }}>
                {info.isMax ? t('account.maxRank') : t('account.nextRank', { xp: info.xpToNext, rank: info.next!.title })}
              </Text>
            </Card>

            {/* Stats */}
            {stats && (
              <View style={styles.statsGrid}>
                <Stat c={c} label={t('account.quizzes')} value={String(stats.total_quizzes)} />
                <Stat c={c} label={t('account.accuracy')} value={`${accuracy}%`} />
                <Stat c={c} label={t('account.streak')} value={String(stats.current_streak)} />
                <Stat c={c} label={t('account.best')} value={String(stats.longest_streak)} />
              </View>
            )}

            {/* Achievements */}
            <Text style={[styles.section, { color: c.textSecondary }]}>
              {t('account.achievements')} · {earnedCount}/{achievements.length}
            </Text>
            <View style={styles.achGrid}>
              {achievements.map((a) => (
                <View
                  key={a.id}
                  style={[styles.ach, { backgroundColor: c.card, borderColor: a.earned ? c.brand : c.border, opacity: a.earned ? 1 : 0.5 }]}
                >
                  <Ionicons name={a.earned ? 'ribbon' : 'ribbon-outline'} size={20} color={a.earned ? c.brand : c.textSecondary} />
                  <Text style={{ color: c.text, fontWeight: '700', fontSize: 12, marginTop: 4 }} numberOfLines={1}>{a.label}</Text>
                  <Text style={{ color: c.textSecondary, fontSize: 10.5, textAlign: 'center' }} numberOfLines={2}>{a.description}</Text>
                </View>
              ))}
            </View>

            {/* Menu */}
            <View style={{ marginTop: 20, gap: 10 }}>
              {menu.map((m) => (
                <Pressable key={m.label} onPress={() => router.push(m.route)}>
                  <Card style={styles.row}>
                    <Ionicons name={m.icon} size={20} color={c.brand} />
                    <Text style={{ color: c.text, fontWeight: '600', flex: 1 }}>{m.label}</Text>
                    <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
                  </Card>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={signOut} style={{ marginTop: 24, alignItems: 'center' }}>
              <Text style={{ color: c.error, fontWeight: '700' }}>{t('account.signOut')}</Text>
            </Pressable>
          </>
        ) : (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <SharkFin size={64} color={c.brand} />
            <Text style={{ color: c.text, fontWeight: '800', fontSize: 22, marginTop: 12 }}>devShark</Text>
            <Text style={{ color: c.textSecondary, marginTop: 8, marginBottom: 24, textAlign: 'center' }}>{t('account.signInPrompt')}</Text>
            <PrimaryButton label={t('account.signInGoogle')} onPress={handleSignIn} loading={busy || isLoading} style={{ alignSelf: 'stretch' }} />
            <Pressable onPress={() => router.push('/settings' as Href)} style={{ marginTop: 20 }}>
              <Text style={{ color: c.brand, fontWeight: '700' }}>{t('account.menu.settings')}</Text>
            </Pressable>
          </View>
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
  body: { padding: 20, paddingBottom: 40 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  tokenPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  xpTrack: { height: 8, borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  stat: { flexBasis: '47%', flexGrow: 1, alignItems: 'center' },
  section: { marginTop: 24, marginBottom: 10, fontWeight: '700', textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 },
  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ach: { width: '31%', borderWidth: 1.5, borderRadius: 12, padding: 10, alignItems: 'center', minHeight: 92, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
