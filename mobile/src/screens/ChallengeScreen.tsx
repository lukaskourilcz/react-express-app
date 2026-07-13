import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '../lib/useColors';
import { useT } from '../lib/i18n';
import { offlineChallengeQuestions } from '../data/offline';
import type { RoadmapQuestion } from '../lib/roadmapApi';
import { awardQuestXp } from '../lib/xp';
import { challengeRunXp } from '../lib/leveling';
import { playCorrect, playWrong } from '../lib/settings';
import { PrimaryButton } from '../components/ui';
import { SharkFin } from '../components/SharkFin';

const BEST_KEY = 'devquiz:challenge:best';
const RUN_SECONDS = 90;
const MAX_LIVES = 3;
const QUESTION_COUNT = 60;
const HIGHLIGHT_MS = 400;

type Phase = 'idle' | 'running' | 'over';

export default function ChallengeScreen() {
  const c = useColors();
  const router = useRouter();
  const { t } = useT();

  const [phase, setPhase] = useState<Phase>('idle');
  const [questions, setQuestions] = useState<RoadmapQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [timeLeft, setTimeLeft] = useState(RUN_SECONDS);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const [xpEarned, setXpEarned] = useState(0);

  // Refs mirror the values that async callbacks (timer tick, delayed advance)
  // read, so those closures never see stale state.
  const scoreRef = useRef(0);
  const bestRef = useRef<number | null>(null);
  const endedRef = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the persisted best score once.
  useEffect(() => {
    AsyncStorage.getItem(BEST_KEY)
      .then((raw) => {
        const n = raw == null ? null : parseInt(raw, 10);
        if (n != null && Number.isFinite(n)) {
          bestRef.current = n;
          setBest(n);
        }
      })
      .catch(() => {});
  }, []);

  // Clear any pending delayed-advance timer on unmount.
  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  // Countdown — one interval per run; cleared on unmount or phase change.
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => {
      setTimeLeft((remaining) => {
        if (remaining <= 1) {
          clearInterval(id);
          endRun(scoreRef.current);
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const endRun = (finalScore: number) => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    const xp = challengeRunXp(finalScore);
    awardQuestXp(xp, 'quiz');
    setXpEarned(xp);
    const prevBest = bestRef.current;
    if (prevBest == null || finalScore > prevBest) {
      bestRef.current = finalScore;
      setBest(finalScore);
      AsyncStorage.setItem(BEST_KEY, String(finalScore)).catch(() => {});
    }
    setPhase('over');
  };

  const start = () => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    setQuestions(offlineChallengeQuestions(QUESTION_COUNT));
    setQIndex(0);
    setScore(0);
    scoreRef.current = 0;
    setLives(MAX_LIVES);
    setTimeLeft(RUN_SECONDS);
    setSelected(null);
    setRevealed(false);
    setXpEarned(0);
    endedRef.current = false;
    setPhase('running');
  };

  const choose = (i: number) => {
    if (revealed || phase !== 'running') return;
    const question = questions[qIndex];
    const correct = i === question.correctAnswer;
    setSelected(i);
    setRevealed(true);
    if (correct) {
      const next = score + 1;
      scoreRef.current = next;
      setScore(next);
      playCorrect();
    } else {
      playWrong();
    }
    const newLives = correct ? lives : lives - 1;
    if (!correct) setLives(newLives);

    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      if (endedRef.current) return;
      if (newLives <= 0) {
        endRun(scoreRef.current);
        return;
      }
      const nextIndex = qIndex + 1;
      if (nextIndex >= questions.length) {
        endRun(scoreRef.current);
        return;
      }
      setQIndex(nextIndex);
      setSelected(null);
      setRevealed(false);
    }, HIGHLIGHT_MS);
  };

  /* ──── idle ─────────────────────────────────────────────────────────── */
  if (phase === 'idle') {
    return (
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: c.background }]}>
        <Header c={c} onBack={() => router.back()} backLabel={t('common.back')} />
        <View style={styles.centered}>
          <SharkFin size={72} color={c.brand} />
          <Text style={[styles.title, { color: c.text }]}>{t('challenge.title')}</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>{t('challenge.subtitle')}</Text>
          {best != null && (
            <Text style={[styles.bestLine, { color: c.gold }]}>{t('challenge.best', { n: best })}</Text>
          )}
          <View style={styles.startBtnWrap}>
            <PrimaryButton label={t('challenge.start')} onPress={start} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* ──── over ─────────────────────────────────────────────────────────── */
  if (phase === 'over') {
    return (
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: c.background }]}>
        <Header c={c} onBack={() => router.back()} backLabel={t('common.back')} />
        <View style={styles.centered}>
          <SharkFin size={64} color={c.brand} />
          <Text style={[styles.title, { color: c.text }]}>{t('challenge.gameOver')}</Text>
          <Text style={[styles.finalLabel, { color: c.textSecondary }]}>{t('challenge.finalScore')}</Text>
          <Text style={[styles.finalScore, { color: c.brand }]}>{score}</Text>
          <View style={[styles.xpPill, { backgroundColor: c.brandSoft }]}>
            <Text style={[styles.xpText, { color: c.goldDark }]}>{t('challenge.xpEarned', { xp: xpEarned })}</Text>
          </View>
          {best != null && (
            <Text style={[styles.bestLine, { color: c.gold }]}>{t('challenge.best', { n: best })}</Text>
          )}
          <View style={styles.startBtnWrap}>
            <PrimaryButton label={t('challenge.playAgain')} onPress={start} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* ──── running ──────────────────────────────────────────────────────── */
  const question = questions[qIndex];
  const timeFrac = Math.max(0, Math.min(1, timeLeft / RUN_SECONDS));
  const isRight = selected != null && selected === question.correctAnswer;

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={styles.runHeader}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel={t('common.back')}>
          <Ionicons name="close" size={26} color={c.textSecondary} />
        </Pressable>
        <View style={styles.hearts}>
          {Array.from({ length: MAX_LIVES }, (_, i) => (
            <Ionicons
              key={i}
              name={i < lives ? 'heart' : 'heart-outline'}
              size={20}
              color={i < lives ? c.coral : c.border}
            />
          ))}
        </View>
        <Text style={[styles.scorePill, { color: c.text }]}>
          {t('challenge.score')} {score}
        </Text>
      </View>

      <View style={styles.timerRow}>
        <View style={[styles.timerTrack, { backgroundColor: c.border }]}>
          <View
            style={{
              width: `${timeFrac * 100}%`,
              height: '100%',
              backgroundColor: timeLeft <= 10 ? c.error : c.ocean,
              borderRadius: 6,
            }}
          />
        </View>
        <Text style={[styles.timerText, { color: timeLeft <= 10 ? c.error : c.textSecondary }]}>
          {t('challenge.timeLeft', { s: timeLeft })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.question, { color: c.text }]}>{question.question}</Text>

        <View style={{ gap: 10, marginTop: 8 }}>
          {question.options.map((option, i) => {
            const isCorrect = i === question.correctAnswer;
            const isPicked = i === selected;
            let borderColor = c.border;
            let bg = c.card;
            let fg = c.text;
            if (revealed && isCorrect) {
              borderColor = c.success;
              bg = 'rgba(46,125,50,0.12)';
              fg = c.success;
            } else if (revealed && isPicked && !isCorrect) {
              borderColor = c.error;
              bg = 'rgba(198,40,40,0.12)';
              fg = c.error;
            } else if (isPicked) {
              borderColor = c.brand;
            }
            return (
              <Pressable
                key={i}
                onPress={() => choose(i)}
                disabled={revealed}
                style={[styles.option, { borderColor, backgroundColor: bg }]}
              >
                <Text style={{ color: fg, fontSize: 15, fontWeight: '600', flex: 1 }}>{option}</Text>
                {revealed && isCorrect && <Ionicons name="checkmark-circle" size={20} color={c.success} />}
              </Pressable>
            );
          })}
        </View>

        {revealed && (
          <Text style={[styles.feedbackText, { color: isRight ? c.success : c.error }]}>
            {isRight ? t('lesson.correct') : t('lesson.incorrect')}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({
  c,
  onBack,
  backLabel,
}: {
  c: ReturnType<typeof useColors>;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <View style={styles.plainHeader}>
      <Pressable onPress={onBack} hitSlop={10} accessibilityLabel={backLabel}>
        <Ionicons name="close" size={26} color={c.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  plainHeader: { paddingHorizontal: 16, paddingVertical: 10 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 21, marginTop: 4, maxWidth: 320 },
  bestLine: { fontSize: 15, fontWeight: '700', marginTop: 8 },
  startBtnWrap: { width: '100%', maxWidth: 320, marginTop: 20 },
  finalLabel: { fontSize: 15, marginTop: 12 },
  finalScore: { fontSize: 56, fontWeight: '800' },
  xpPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, marginTop: 4 },
  xpText: { fontSize: 16, fontWeight: '800' },
  runHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  hearts: { flexDirection: 'row', gap: 4 },
  scorePill: { fontSize: 15, fontWeight: '800' },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 6 },
  timerTrack: { flex: 1, height: 10, borderRadius: 6, overflow: 'hidden' },
  timerText: { fontSize: 14, fontWeight: '700', minWidth: 42, textAlign: 'right' },
  body: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 32 },
  question: { fontSize: 18, fontWeight: '700', lineHeight: 25, marginBottom: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  feedbackText: { fontSize: 16, fontWeight: '800', textAlign: 'center', marginTop: 18 },
});
