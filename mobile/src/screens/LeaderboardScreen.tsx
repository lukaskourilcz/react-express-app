import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/useColors';
import { fetchGlobalLeaderboard } from '../lib/quizApi';
import { friendlyError } from '../lib/api';
import { LoadingScreen } from '../components/ui';
import type { LeaderboardGlobalEntry } from '../types';

export default function LeaderboardScreen() {
  const c = useColors();
  const [entries, setEntries] = useState<LeaderboardGlobalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchGlobalLeaderboard(50);
      setEntries(data.entries);
    } catch (err) {
      setError(friendlyError(err));
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
      <Text style={[styles.h1, { color: c.text }]}>Global leaderboard</Text>
      {error ? (
        <Text style={{ color: c.error, paddingHorizontal: 20 }}>{error}</Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, i) => `${item.display_name}-${i}`}
          contentContainerStyle={{ padding: 20, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} />}
          ListEmptyComponent={<Text style={{ color: c.textSecondary }}>No scores yet.</Text>}
          renderItem={({ item, index }) => (
            <View style={[styles.row, { borderBottomColor: c.border }]}>
              <Text style={[styles.rank, { color: index === 0 ? c.brand : c.textSecondary }]}>{index + 1}</Text>
              <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                {item.display_name}
              </Text>
              <Text style={[styles.score, { color: c.text }]}>{item.total_correct}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  h1: { fontSize: 24, fontWeight: '800', padding: 20, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  rank: { width: 28, fontWeight: '800', fontSize: 15 },
  name: { flex: 1, fontWeight: '500' },
  score: { fontWeight: '800' },
});
