import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '../lib/useColors';
import { friendlyError } from '../lib/api';
import {
  fetchRoadmapLevel,
  fetchRoadmapCheckpoint,
  type RoadmapPlayable,
  type RoadmapTopic,
} from '../lib/roadmapApi';
import { recordLevelResult, recordCheckpointResult, pushProgressToServer, nextAfter } from '../lib/roadmapProgress';
import { recordActivityToday } from '../lib/streak';
import { useT, getLang } from '../lib/i18n';

function haptic(kind: 'select' | 'success' | 'warning'): void {
  try {
    if (kind === 'select') void Haptics.selectionAsync();
    else if (kind === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // haptics unavailable (web/simulator) — ignore
  }
}
import { QuestionText } from '../components/QuestionText';
import { Hearts } from '../components/Hearts';
import { PrimaryButton } from '../components/ui';

const MAX_HEARTS = 3;
const GREEN = '#2e7d32';
const RED = '#c62828';
const GOLD = '#ffb300';

export default function LessonScreen() {
  const c = useColors();
  const router = useRouter();
  const { t } = useT();
  const params = useLocalSearchParams<{
    topic: RoadmapTopic;
    kind: 'level' | 'checkpoint';
    ref: string;
    lc?: string;
    cc?: string;
  }>();
  const topic = params.topic;
  const kind = params.kind;
  const ref = parseInt(params.ref ?? '1', 10);
  const levelCount = parseInt(params.lc ?? '0', 10);
  const checkpointCount = parseInt(params.cc ?? '0', 10);

  const [playable, setPlayable] = useState<RoadmapPlayable | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [dead, setDead] = useState(false);

  const resetPlayer = () => {
    setQIndex(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setMistakes(0);
    setFinished(false);
    setDead(false);
  };

  const load = () => {
    setError(null);
    setPlayable(null);
    resetPlayer();
    const req =
      kind === 'checkpoint' ? fetchRoadmapCheckpoint(topic, ref, getLang()) : fetchRoadmapLevel(topic, ref, getLang());
    req.then(setPlayable).catch((e) => setError(friendlyError(e)));
  };
  // Re-runs when params change too, so "Next level" (router.replace) starts fresh.
  useEffect(load, [topic, kind, ref]);

  if (error) {
    return (
      <Centered c={c}>
        <Text style={{ color: c.error, marginBottom: 16, textAlign: 'center' }}>{error}</Text>
        <PrimaryButton label={t('common.retry')} onPress={load} />
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: c.textSecondary }}>{t('common.back')}</Text>
        </Pressable>
      </Centered>
    );
  }
  if (!playable) {
    return (
      <Centered c={c}>
        <ActivityIndicator color={c.brand} size="large" />
      </Centered>
    );
  }

  const isCheckpoint = playable.kind === 'checkpoint';
  const accent = isCheckpoint ? GOLD : c.brand;
  const total = playable.questions.length;
  const question = playable.questions[qIndex];
  const outOfHearts = !isCheckpoint && mistakes >= MAX_HEARTS;
  const isRight = selected === question.correctAnswer;

  const choose = (i: number) => {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
    if (i === question.correctAnswer) {
      setCorrectCount((n) => n + 1);
      haptic('success');
    } else {
      if (!isCheckpoint) setMistakes((m) => m + 1);
      haptic('warning');
    }
  };

  const finish = (deadByHearts: boolean) => {
    const pct = Math.round((correctCount / total) * 100);
    if (isCheckpoint) recordCheckpointResult(topic, ref, pct, playable.passPct);
    else recordLevelResult(topic, ref, pct, playable.passPct);
    void recordActivityToday();
    void pushProgressToServer();
    if (!deadByHearts && pct >= playable.passPct) haptic('success');
    setDead(deadByHearts);
    setFinished(true);
  };

  const advance = () => {
    if (outOfHearts) {
      finish(true);
    } else if (qIndex < total - 1) {
      setQIndex((n) => n + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      finish(false);
    }
  };

  if (finished) {
    const pct = Math.round((correctCount / total) * 100);
    const passed = !dead && pct >= playable.passPct;
    const next = passed && levelCount > 0 ? nextAfter(kind, ref, levelCount, checkpointCount) : null;
    const goNext = () => {
      if (!next) return;
      router.replace({
        pathname: '/lesson',
        params: { topic, kind: next.kind, ref: String(next.ref), lc: String(levelCount), cc: String(checkpointCount) },
      });
    };
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
        <Centered c={c}>
          <Text style={styles.emoji}>{dead ? '💔' : passed ? (isCheckpoint ? '🏆' : '🎉') : '💪'}</Text>
          <Text style={[styles.resultTitle, { color: c.text }]}>
            {dead
              ? t('lesson.outOfHearts')
              : passed
                ? isCheckpoint ? t('lesson.checkpointComplete') : t('lesson.levelComplete')
                : t('lesson.notPassed')}
          </Text>
          {dead ? (
            <Text style={[styles.resultBody, { color: c.textSecondary }]}>
              {t('lesson.outOfHeartsBody', { max: MAX_HEARTS })}
            </Text>
          ) : (
            <>
              <Text style={[styles.pct, { color: passed ? accent : c.textSecondary }]}>{pct}%</Text>
              <Text style={[styles.resultBody, { color: c.textSecondary }]}>
                {t('lesson.scoreLine', { correct: correctCount, total })}
              </Text>
              {!passed && (
                <Text style={[styles.resultBody, { color: c.textSecondary }]}>{t('lesson.passNeeded', { pct: playable.passPct })}</Text>
              )}
            </>
          )}
          <View style={{ width: '100%', maxWidth: 320, marginTop: 24, gap: 12 }}>
            {next && (
              <PrimaryButton
                label={next.kind === 'checkpoint' ? t('lesson.checkpointExam') : t('lesson.nextLevel')}
                onPress={goNext}
                style={{ backgroundColor: accent }}
              />
            )}
            <Pressable onPress={resetPlayer} style={[styles.secondaryBtn, { borderColor: accent }]}>
              <Text style={{ color: accent, fontWeight: '700' }}>{t('lesson.tryAgain')}</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.linkBtn}>
              <Text style={{ color: c.textSecondary, fontWeight: '600' }}>{t('lesson.backToPath')}</Text>
            </Pressable>
          </View>
        </Centered>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={styles.lessonHeader}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Exit">
          <Ionicons name="close" size={26} color={c.textSecondary} />
        </Pressable>
        {isCheckpoint ? (
          <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
            <View style={{ width: `${((qIndex + (revealed ? 1 : 0)) / total) * 100}%`, height: '100%', backgroundColor: accent, borderRadius: 6 }} />
          </View>
        ) : (
          <Hearts mistakes={mistakes} />
        )}
        <Text style={{ color: c.textSecondary, fontWeight: '700' }}>
          {qIndex + 1}/{total}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.lessonBody}>
        <View style={[styles.chip, { backgroundColor: c.brandSoft }]}>
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 12 }}>
            {isCheckpoint ? t('lesson.checkpoint') : t('lesson.level', { n: playable.ref })} · {playable.title}
          </Text>
        </View>

        <View style={{ marginVertical: 16 }}>
          <QuestionText text={question.question} />
        </View>

        <View style={{ gap: 10 }}>
          {question.options.map((option, i) => {
            const isCorrect = i === question.correctAnswer;
            const isPicked = i === selected;
            let borderColor = c.border;
            let bg = c.card;
            let fg = c.text;
            if (revealed && isCorrect) {
              borderColor = GREEN; bg = 'rgba(46,125,50,0.12)'; fg = GREEN;
            } else if (revealed && isPicked && !isCorrect) {
              borderColor = RED; bg = 'rgba(198,40,40,0.12)'; fg = RED;
            } else if (isPicked) {
              borderColor = accent;
            }
            return (
              <Pressable
                key={i}
                onPress={() => choose(i)}
                disabled={revealed}
                style={[styles.option, { borderColor, backgroundColor: bg }]}
              >
                <Text style={{ color: fg, fontSize: 15, fontWeight: '600', flex: 1 }}>{option}</Text>
                {revealed && isCorrect && <Ionicons name="checkmark-circle" size={20} color={GREEN} />}
              </Pressable>
            );
          })}
        </View>

        {revealed && (
          <View style={[styles.feedback, { borderLeftColor: isRight ? GREEN : RED, backgroundColor: isRight ? 'rgba(46,125,50,0.08)' : 'rgba(198,40,40,0.08)' }]}>
            <Text style={{ fontWeight: '800', color: isRight ? GREEN : RED, marginBottom: 4 }}>
              {isRight ? t('lesson.correct') : t('lesson.incorrect')}
            </Text>
            <Text style={{ color: c.textSecondary, lineHeight: 20 }}>{question.explanation}</Text>
          </View>
        )}
      </ScrollView>

      {revealed && (
        <View style={[styles.footer, { backgroundColor: c.background, borderTopColor: c.border }]}>
          <PrimaryButton
            label={outOfHearts ? t('lesson.seeResult') : qIndex < total - 1 ? t('lesson.continue') : t('lesson.finish')}
            onPress={advance}
            style={{ backgroundColor: accent }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function Centered({ children, c }: { children: React.ReactNode; c: ReturnType<typeof useColors> }) {
  return <View style={[styles.centered, { backgroundColor: c.background }]}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  lessonHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 10 },
  progressTrack: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
  lessonBody: { paddingHorizontal: 16, paddingBottom: 24 },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  feedback: { marginTop: 16, borderLeftWidth: 4, borderRadius: 10, padding: 14 },
  footer: { padding: 16, borderTopWidth: 1 },
  emoji: { fontSize: 56, marginBottom: 8 },
  resultTitle: { fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  pct: { fontSize: 40, fontWeight: '800' },
  resultBody: { fontSize: 15, marginTop: 4, textAlign: 'center' },
  secondaryBtn: { alignItems: 'center', paddingVertical: 13, borderRadius: 10, borderWidth: 2 },
  linkBtn: { alignItems: 'center', paddingVertical: 10 },
});
