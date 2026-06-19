import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/useColors';
import { friendlyError } from '../lib/api';
import {
  fetchRoadmapLevel,
  fetchRoadmapCheckpoint,
  type RoadmapPlayable,
  type RoadmapTopic,
} from '../lib/roadmapApi';
import { recordLevelResult, recordCheckpointResult, pushProgressToServer } from '../lib/roadmapProgress';
import { recordActivityToday } from '../lib/streak';
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
  const params = useLocalSearchParams<{ topic: RoadmapTopic; kind: 'level' | 'checkpoint'; ref: string }>();
  const topic = params.topic;
  const kind = params.kind;
  const ref = parseInt(params.ref ?? '1', 10);

  const [playable, setPlayable] = useState<RoadmapPlayable | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [dead, setDead] = useState(false);

  const load = () => {
    setError(null);
    setPlayable(null);
    const req = kind === 'checkpoint' ? fetchRoadmapCheckpoint(topic, ref) : fetchRoadmapLevel(topic, ref);
    req.then(setPlayable).catch((e) => setError(friendlyError(e)));
  };
  useEffect(load, [topic, kind, ref]);

  if (error) {
    return (
      <Centered c={c}>
        <Text style={{ color: c.error, marginBottom: 16, textAlign: 'center' }}>{error}</Text>
        <PrimaryButton label="Retry" onPress={load} />
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: c.textSecondary }}>Back</Text>
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
    if (i === question.correctAnswer) setCorrectCount((n) => n + 1);
    else if (!isCheckpoint) setMistakes((m) => m + 1);
  };

  const finish = () => {
    const pct = Math.round((correctCount / total) * 100);
    if (isCheckpoint) recordCheckpointResult(topic, ref, pct, playable.passPct);
    else recordLevelResult(topic, ref, pct, playable.passPct);
    void recordActivityToday();
    void pushProgressToServer();
    setFinished(true);
  };

  const advance = () => {
    if (outOfHearts) {
      setDead(true);
      finish();
    } else if (qIndex < total - 1) {
      setQIndex((n) => n + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      finish();
    }
  };

  const replay = () => {
    setFinished(false);
    setDead(false);
    setMistakes(0);
    setQIndex(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
  };

  if (finished) {
    const pct = Math.round((correctCount / total) * 100);
    const passed = !dead && pct >= playable.passPct;
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
        <Centered c={c}>
          <Text style={styles.emoji}>{dead ? '💔' : passed ? (isCheckpoint ? '🏆' : '🎉') : '💪'}</Text>
          <Text style={[styles.resultTitle, { color: c.text }]}>
            {dead ? 'Out of hearts!' : passed ? (isCheckpoint ? 'Checkpoint cleared!' : 'Level complete!') : 'Not passed yet'}
          </Text>
          {dead ? (
            <Text style={[styles.resultBody, { color: c.textSecondary }]}>
              You used all {MAX_HEARTS} hearts. Restart the level to try again.
            </Text>
          ) : (
            <>
              <Text style={[styles.pct, { color: passed ? accent : c.textSecondary }]}>{pct}%</Text>
              <Text style={[styles.resultBody, { color: c.textSecondary }]}>
                {correctCount} of {total} correct
              </Text>
              {!passed && (
                <Text style={[styles.resultBody, { color: c.textSecondary }]}>Score {playable.passPct}% to pass.</Text>
              )}
            </>
          )}
          <View style={{ width: '100%', maxWidth: 320, marginTop: 24, gap: 12 }}>
            <PrimaryButton label="Try again" onPress={replay} style={{ backgroundColor: accent }} />
            <Pressable onPress={() => router.back()} style={styles.linkBtn}>
              <Text style={{ color: c.textSecondary, fontWeight: '600' }}>Back to path</Text>
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
            {isCheckpoint ? 'Checkpoint' : `Level ${playable.ref}`} · {playable.title}
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
              {isRight ? 'Correct' : 'Not quite'}
            </Text>
            <Text style={{ color: c.textSecondary, lineHeight: 20 }}>{question.explanation}</Text>
          </View>
        )}
      </ScrollView>

      {revealed && (
        <View style={[styles.footer, { backgroundColor: c.background, borderTopColor: c.border }]}>
          <PrimaryButton
            label={outOfHearts ? 'See result' : qIndex < total - 1 ? 'Continue' : 'Finish'}
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
  linkBtn: { alignItems: 'center', paddingVertical: 10 },
});
