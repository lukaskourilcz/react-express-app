import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/useColors';
import { fetchLeaderboard, type LeaderboardEntry, type LeaderboardPeriod } from '../lib/quizApi';
import { getCategoryLabel } from '../lib/categories';
import { friendlyError } from '../lib/api';
import { useT } from '../lib/i18n';

const TABS: { period: LeaderboardPeriod; key: 'leaderboard.global' | 'leaderboard.daily' | 'leaderboard.category' }[] = [
  { period: 'global', key: 'leaderboard.global' },
  { period: 'daily', key: 'leaderboard.daily' },
  { period: 'category', key: 'leaderboard.category' },
];
const CATEGORIES = ['javascript', 'typescript', 'react', 'css', 'html', 'git', 'nodejs'];
const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const c = useColors();
  const { t } = useT();
  const [period, setPeriod] = useState<LeaderboardPeriod>('global');
  const [category, setCategory] = useState('javascript');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchLeaderboard(period, { category, limit: 50 });
      setEntries(data.entries ?? []);
    } catch (err) {
      setError(friendlyError(err));
      setEntries([]);
    }
  }, [period, category]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const scoreOf = (e: LeaderboardEntry): string => {
    if (period === 'daily') return `${e.correct ?? 0}/${e.total ?? 0}`;
    if (period === 'category') return `${e.accuracy ?? 0}%`;
    return String(e.total_correct ?? 0);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
      <Text style={[styles.h1, { color: c.text }]}>{t('leaderboard.title')}</Text>

      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const active = period === tab.period;
          return (
            <Pressable
              key={tab.period}
              onPress={() => setPeriod(tab.period)}
              style={[styles.tab, { borderBottomColor: active ? c.brand : 'transparent' }]}
            >
              <Text style={{ color: active ? c.brand : c.textSecondary, fontWeight: '700' }}>{t(tab.key)}</Text>
            </Pressable>
          );
        })}
      </View>

      {period === 'category' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
          {CATEGORIES.map((cat) => {
            const active = cat === category;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.catChip, { borderColor: active ? c.brand : c.border, backgroundColor: active ? c.brandSoft : c.card }]}
              >
                <Text style={{ color: active ? c.brand : c.textSecondary, fontWeight: '600', fontSize: 13 }}>{getCategoryLabel(cat)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator size="large" color={c.brand} />
        </View>
      ) : error ? (
        <Text style={{ color: c.error, paddingHorizontal: 20, marginTop: 12 }}>{error}</Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, i) => `${item.display_name}-${i}`}
          contentContainerStyle={{ padding: 20, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} />}
          ListEmptyComponent={<Text style={{ color: c.textSecondary }}>{t('leaderboard.empty')}</Text>}
          renderItem={({ item, index }) => (
            <View style={[styles.row, { borderBottomColor: c.border }]}>
              <Text style={[styles.rank, { color: index < 3 ? c.text : c.textSecondary }]}>
                {index < 3 ? MEDALS[index] : index + 1}
              </Text>
              <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{item.display_name}</Text>
              <Text style={[styles.score, { color: c.brand }]}>{scoreOf(item)}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 24, fontWeight: '800', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 20 },
  tab: { paddingVertical: 8, borderBottomWidth: 2 },
  cats: { paddingHorizontal: 20, paddingVertical: 10, gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  rank: { width: 30, fontWeight: '800', fontSize: 15, textAlign: 'center' },
  name: { flex: 1, fontWeight: '500' },
  score: { fontWeight: '800' },
});
