import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '../lib/useColors';
import { getCategoryColor, getCategoryLabel } from '../lib/categories';
import { friendlyError } from '../lib/api';
import { fetchRoadmapStructure, type RoadmapStructure, type RoadmapTopic } from '../lib/roadmapApi';
import { useRoadmapProgress, passedLevelCount, syncProgressWithServer } from '../lib/roadmapProgress';
import { useStreak } from '../lib/streak';
import { RoadmapPath } from '../components/RoadmapPath';
import { PrimaryButton } from '../components/ui';

const TOPICS: RoadmapTopic[] = ['javascript', 'typescript', 'react', 'html', 'css', 'git'];
const TOPIC_KEY = 'devquiz:roadmap:topic';

export default function LearnScreen() {
  const c = useColors();
  const router = useRouter();
  const progress = useRoadmapProgress();
  const streak = useStreak();

  const [structure, setStructure] = useState<RoadmapStructure | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<RoadmapTopic>('javascript');

  const load = () => {
    setError(null);
    setStructure(null);
    fetchRoadmapStructure()
      .then(setStructure)
      .catch((e) => setError(friendlyError(e)));
  };

  useEffect(load, []);
  useEffect(() => {
    void syncProgressWithServer();
    void AsyncStorage.getItem(TOPIC_KEY).then((saved) => {
      if (saved && (TOPICS as string[]).includes(saved)) setTopic(saved as RoadmapTopic);
    });
  }, []);

  const selectTopic = (next: RoadmapTopic) => {
    setTopic(next);
    void AsyncStorage.setItem(TOPIC_KEY, next);
  };

  const topicData = structure?.structure[topic];
  const levels = topicData?.levels ?? [];
  const checkpoints = topicData?.checkpoints ?? [];
  const done = passedLevelCount(progress, topic);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Learn</Text>
        <Pressable style={styles.streakChip} onPress={() => router.push('/streak')} accessibilityLabel="Streak">
          <Ionicons name="flame" size={18} color={streak.current > 0 ? '#ff6d00' : c.textSecondary} />
          <Text style={[styles.streakText, { color: c.text }]}>{streak.current}</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        {TOPICS.map((value) => {
          const selected = topic === value;
          const color = getCategoryColor(value);
          return (
            <Pressable
              key={value}
              onPress={() => selectTopic(value)}
              style={[
                styles.pill,
                { borderColor: selected ? color : c.border, backgroundColor: selected ? color : c.card },
              ]}
            >
              <Text style={{ color: selected ? '#fff' : c.textSecondary, fontWeight: '700' }}>
                {getCategoryLabel(value)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {error ? (
        <View style={styles.centered}>
          <Text style={{ color: c.error, marginBottom: 16, textAlign: 'center' }}>{error}</Text>
          <PrimaryButton label="Retry" onPress={load} />
        </View>
      ) : !structure ? (
        <View style={styles.centered}>
          <ActivityIndicator color={c.brand} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.pathWrap}>
          <Text style={[styles.progress, { color: c.textSecondary }]}>
            {getCategoryLabel(topic)} · {done}/{levels.length} levels
          </Text>
          <RoadmapPath
            topic={topic}
            levels={levels}
            checkpoints={checkpoints}
            progress={progress}
            onOpenLevel={(level) =>
              router.push({
                pathname: '/lesson',
                params: { topic, kind: 'level', ref: String(level), lc: String(levels.length), cc: String(checkpoints.length) },
              })
            }
            onOpenCheckpoint={(cp) =>
              router.push({
                pathname: '/lesson',
                params: { topic, kind: 'checkpoint', ref: String(cp), lc: String(levels.length), cc: String(checkpoints.length) },
              })
            }
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 28, fontWeight: '800' },
  streakChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  streakText: { fontWeight: '800', fontSize: 16 },
  pills: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  pathWrap: { paddingHorizontal: 16, paddingBottom: 48 },
  progress: { textAlign: 'center', fontWeight: '700', marginBottom: 8 },
});
