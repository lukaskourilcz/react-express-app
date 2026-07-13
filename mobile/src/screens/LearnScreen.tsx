import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '../lib/useColors';
import { getCategoryColor, getCategoryLabel } from '../lib/categories';
import { friendlyError } from '../lib/api';
import {
  fetchRoadmapStructure,
  ROADMAP_TOPICS,
  type RoadmapStructure,
  type RoadmapTopic,
} from '../lib/roadmapApi';
import {
  useRoadmapProgress,
  useExtraUnlocks,
  passedLevelCount,
  syncProgressWithServer,
  partRanges,
  currentPart,
  pathStatus,
  isPathUnlocked,
  isTopicUnlocked,
  topicUnlockHint,
  PART_TEST_PASS,
  type PartRange,
} from '../lib/roadmapProgress';
import { useStreak, syncStreakWithServer } from '../lib/streak';
import { syncXpWithServer } from '../lib/xp';
import { useT } from '../lib/i18n';
import { RoadmapPath } from '../components/RoadmapPath';
import { Wordmark } from '../components/SharkFin';
import { PrimaryButton } from '../components/ui';

// Learn shows the roadmap topics (Play-only "cool-stuff" excluded, like web).
const LEARN_TOPICS: RoadmapTopic[] = ROADMAP_TOPICS.filter((t) => t !== 'cool-stuff');
const TOPIC_KEY = 'devquiz:roadmap:topic';

const STATUS_HINT: Record<string, string> = {
  complete: '✓',
  'in-progress': '…',
};

export default function LearnScreen() {
  const c = useColors();
  const router = useRouter();
  const progress = useRoadmapProgress();
  const extra = useExtraUnlocks();
  const streak = useStreak();
  const { t } = useT();

  const [structure, setStructure] = useState<RoadmapStructure | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<RoadmapTopic>('javascript');
  const [part, setPart] = useState(1);

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
    void syncStreakWithServer();
    void syncXpWithServer();
    void AsyncStorage.getItem(TOPIC_KEY).then((saved) => {
      if (saved && (LEARN_TOPICS as string[]).includes(saved)) setTopic(saved as RoadmapTopic);
    });
  }, []);

  const topicData = structure?.structure[topic];
  const levels = topicData?.levels ?? [];
  const ranges = useMemo<PartRange[]>(() => partRanges(levels.length), [levels.length]);

  // Land on the learner's current part whenever the topic (or its ranges) change.
  useEffect(() => {
    if (ranges.length) setPart(currentPart(progress, topic, ranges, extra));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, ranges.length]);

  const selectTopic = (next: RoadmapTopic) => {
    if (!isTopicUnlocked(progress, next, extra)) return;
    setTopic(next);
    void AsyncStorage.setItem(TOPIC_KEY, next);
  };

  const range = ranges[part - 1];
  const done = passedLevelCount(progress, topic);
  const partQuestionCount = range
    ? Math.min(20, levels.filter((l) => l.level >= range.startLevel && l.level <= range.endLevel).reduce((s, l) => s + l.questionCount, 0))
    : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.header}>
        <Wordmark size={19} finSize={22} />
        <Pressable style={styles.streakChip} onPress={() => router.push('/streak')} accessibilityLabel="Streak">
          <Ionicons name="flame" size={18} color={streak.current > 0 ? '#ff6d00' : c.textSecondary} />
          <Text style={[styles.streakText, { color: c.text }]}>{streak.current}</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        {LEARN_TOPICS.map((value) => {
          const selected = topic === value;
          const color = getCategoryColor(value);
          const unlocked = isTopicUnlocked(progress, value, extra);
          const tLevels = structure?.structure[value]?.levels.length ?? 0;
          const tPct = tLevels ? passedLevelCount(progress, value) / tLevels : 0;
          return (
            <View key={value}>
              <Pressable
                onPress={() => selectTopic(value)}
                style={[
                  styles.pill,
                  {
                    borderColor: selected ? color : c.border,
                    backgroundColor: selected ? color : c.card,
                    opacity: unlocked ? 1 : 0.5,
                  },
                ]}
              >
                {!unlocked && <Ionicons name="lock-closed" size={12} color={selected ? '#fff' : c.textSecondary} style={{ marginRight: 4 }} />}
                <Text style={{ color: selected ? '#fff' : c.textSecondary, fontWeight: '700' }}>
                  {getCategoryLabel(value)}
                </Text>
              </Pressable>
              {unlocked && tLevels > 0 && (
                <View style={[styles.pillTrack, { backgroundColor: c.border }]}>
                  <View style={{ width: `${tPct * 100}%`, height: '100%', backgroundColor: color, borderRadius: 2 }} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {error ? (
        <View style={styles.centered}>
          <Text style={{ color: c.error, marginBottom: 16, textAlign: 'center' }}>{error}</Text>
          <PrimaryButton label={t('common.retry')} onPress={load} />
        </View>
      ) : !structure ? (
        <View style={styles.centered}>
          <ActivityIndicator color={c.brand} size="large" />
        </View>
      ) : !isTopicUnlocked(progress, topic, extra) ? (
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={40} color={c.textSecondary} />
          <Text style={{ color: c.text, fontWeight: '700', marginTop: 12, fontSize: 16 }}>{t('learn.locked')}</Text>
          <Text style={{ color: c.textSecondary, marginTop: 6, textAlign: 'center' }}>
            {topicUnlockHint(progress, topic, getCategoryLabel)}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.pathWrap}>
          <Text style={[styles.progress, { color: c.textSecondary }]}>
            {getCategoryLabel(topic)} · {t('learn.levels', { done, total: levels.length })}
          </Text>

          {/* Part selector */}
          <View style={styles.parts}>
            {ranges.map((r) => {
              const status = pathStatus(progress, topic, ranges, r.part, extra);
              const unlocked = isPathUnlocked(progress, topic, r.part, extra);
              const active = r.part === part;
              return (
                <Pressable
                  key={r.part}
                  onPress={() => unlocked && setPart(r.part)}
                  disabled={!unlocked}
                  style={[
                    styles.partChip,
                    {
                      borderColor: active ? c.brand : c.border,
                      backgroundColor: active ? c.brandSoft : c.card,
                      opacity: unlocked ? 1 : 0.5,
                    },
                  ]}
                >
                  {!unlocked && <Ionicons name="lock-closed" size={11} color={c.textSecondary} style={{ marginRight: 3 }} />}
                  <Text style={{ color: active ? c.brand : c.textSecondary, fontWeight: '700', fontSize: 13 }}>
                    {t('learn.part', { n: r.part })} {STATUS_HINT[status] ?? ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {range && (
            <RoadmapPath
              topic={topic}
              range={range}
              levels={levels}
              partTitle={t('learn.part', { n: range.part })}
              partQuestionCount={partQuestionCount}
              partPassPct={PART_TEST_PASS}
              progress={progress}
              onOpenLevel={(level) =>
                router.push({
                  pathname: '/lesson',
                  params: { topic, kind: 'level', ref: String(level), lc: String(levels.length) },
                })
              }
              onOpenPartTest={(p) =>
                router.push({
                  pathname: '/lesson',
                  params: { topic, kind: 'test', ref: String(p), lc: String(levels.length) },
                })
              }
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  streakChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  streakText: { fontWeight: '800', fontSize: 16 },
  pills: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 2 },
  pillTrack: { height: 3, borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  pathWrap: { paddingHorizontal: 16, paddingBottom: 48 },
  progress: { textAlign: 'center', fontWeight: '700', marginBottom: 8 },
  parts: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  partChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 2 },
});
