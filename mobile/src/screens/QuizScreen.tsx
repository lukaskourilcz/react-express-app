import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/useColors';
import { quizCategoryOptions, getCategoryColor, getCategoryLabel } from '../lib/categories';
import { fetchQuestions, submitQuiz } from '../lib/quizApi';
import { recordQuizResult } from '../lib/userApi';
import { friendlyError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useT, getLang } from '../lib/i18n';
import { computeQuizXp } from '../lib/leveling';
import { awardQuestXp } from '../lib/xp';
import { recordPerfectQuiz } from '../lib/achievements';
import { useBookmarks, toggleBookmark } from '../lib/bookmarks';
import { playComplete } from '../lib/settings';
import type { CategoryType, DifficultyMode, Question, QuizResult } from '../types';
import { PrimaryButton, Card } from '../components/ui';
import { Wordmark } from '../components/SharkFin';
import { ReportDialog } from '../components/ReportDialog';

type Phase = 'settings' | 'loading' | 'in-progress' | 'submitted' | 'error';

const DIFFICULTIES: DifficultyMode[] = ['basics', 'easy', 'zero-to-hero', 'advanced', 'mixed'];
// Match the web client's question-count options.
const COUNTS = [10, 20, 30, 40, 50];

export default function QuizScreen() {
  const c = useColors();
  const router = useRouter();
  const { t } = useT();
  const { user } = useAuth();
  const bookmarks = useBookmarks();

  const [phase, setPhase] = useState<Phase>('settings');
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryType[]>(['javascript']);
  const [difficulty, setDifficulty] = useState<DifficultyMode>('zero-to-hero');
  const [count, setCount] = useState(10);

  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [reportId, setReportId] = useState<string | null>(null);

  const toggleCategory = (cat: CategoryType) =>
    setCategories((prev) => (prev.includes(cat) ? prev.filter((x) => x !== cat) : [...prev, cat]));

  const start = async () => {
    if (categories.length === 0) {
      setError(t('quiz.selectCategories'));
      return;
    }
    setPhase('loading');
    setError(null);
    try {
      const data = await fetchQuestions({ count, difficulty, categories, lang: getLang() });
      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setAnswers({});
      setIndex(0);
      setResult(null);
      setPhase('in-progress');
    } catch (err) {
      setError(friendlyError(err));
      setPhase('error');
    }
  };

  const submit = async () => {
    setPhase('loading');
    try {
      const data = await submitQuiz(sessionId, answers, getLang());
      setResult(data);
      // XP: per-correct, scaled by each question's difficulty (matches web).
      const items = data.results.map((r) => ({
        difficulty: questions.find((q) => q.id === r.questionId)?.difficulty ?? 1,
        correct: r.isCorrect,
      }));
      const xp = computeQuizXp(items);
      setXpEarned(xp);
      if (xp > 0) awardQuestXp(xp, 'quiz');
      if (data.percentage === 100) recordPerfectQuiz();
      playComplete();
      if (user?.id) void recordQuizResult(user.id, data.correctAnswers, data.totalQuestions).catch(() => {});
      setPhase('submitted');
    } catch (err) {
      setError(friendlyError(err));
      setPhase('error');
    }
  };

  const reset = () => {
    setPhase('settings');
    setError(null);
  };

  if (phase === 'loading') {
    return (
      <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.brand} />
      </SafeAreaView>
    );
  }

  if (phase === 'error') {
    return (
      <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: c.background }]}>
        <Text style={{ color: c.error, marginBottom: 16, textAlign: 'center' }}>{error}</Text>
        <PrimaryButton label={t('common.back')} onPress={reset} />
      </SafeAreaView>
    );
  }

  // ---- Results / review ----
  if (phase === 'submitted' && result) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.bigScore, { color: c.brand }]}>{result.percentage}%</Text>
          <Text style={[styles.subtle, { color: c.textSecondary, textAlign: 'center' }]}>
            {t('quiz.scoreLine', { correct: result.correctAnswers, total: result.totalQuestions })}
          </Text>
          {xpEarned > 0 && (
            <View style={[styles.xpPill, { backgroundColor: c.brandSoft }]}>
              <Text style={{ color: c.brand, fontWeight: '800' }}>{t('quiz.xpEarned', { xp: xpEarned })}</Text>
            </View>
          )}
          <Pressable onPress={() => router.push('/challenge' as never)} style={[styles.ctaRow, { borderColor: c.gold }]}>
            <Ionicons name="flash" size={16} color={c.gold} />
            <Text style={{ color: c.gold, fontWeight: '700' }}>{t('quiz.challengeCta')}</Text>
          </Pressable>

          {questions.map((q, i) => {
            const r = result.results.find((x) => x.questionId === q.id);
            const ok = r?.isCorrect;
            const marked = Boolean(bookmarks.ids[q.id]);
            return (
              <Card key={q.id} style={{ marginBottom: 12, borderLeftWidth: 4, borderLeftColor: ok ? c.success : c.error }}>
                <View style={styles.reviewHead}>
                  <Text style={[styles.qNum, { color: c.textSecondary, flex: 1 }]}>
                    {i + 1}. {getCategoryLabel(q.category)} · {ok ? t('lesson.correct') : t('lesson.incorrect')}
                  </Text>
                  <Pressable
                    onPress={() =>
                      toggleBookmark({
                        id: q.id,
                        question: q.question,
                        category: q.category,
                        options: q.options,
                        correctIndex: r?.correctAnswer ?? -1,
                        explanation: r?.explanation ?? '',
                      })
                    }
                    hitSlop={8}
                  >
                    <Ionicons name={marked ? 'bookmark' : 'bookmark-outline'} size={18} color={marked ? c.brand : c.textSecondary} />
                  </Pressable>
                  <Pressable onPress={() => setReportId(q.id)} hitSlop={8} style={{ marginLeft: 12 }}>
                    <Ionicons name="flag-outline" size={17} color={c.textSecondary} />
                  </Pressable>
                </View>
                <Text style={[styles.qText, { color: c.text }]}>{q.question}</Text>
                {r && r.correctAnswer >= 0 && (
                  <Text style={{ color: c.brand, marginTop: 6 }}>
                    {t('quiz.correctAnswer')}: {q.options[r.correctAnswer]}
                  </Text>
                )}
                {r?.explanation ? <Text style={{ color: c.textSecondary, marginTop: 6 }}>{r.explanation}</Text> : null}
              </Card>
            );
          })}
          <PrimaryButton label={t('quiz.retry')} onPress={reset} style={{ marginTop: 8 }} />
        </ScrollView>
        <ReportDialog questionId={reportId ?? ''} visible={reportId !== null} onClose={() => setReportId(null)} />
      </SafeAreaView>
    );
  }

  // ---- In progress ----
  if (phase === 'in-progress') {
    const q = questions[index];
    const selected = answers[q.id];
    const last = index >= questions.length - 1;
    const answeredAll = questions.every((x) => answers[x.id] !== undefined);
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.subtle, { color: c.textSecondary }]}>
            {index + 1} / {questions.length}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
            <View style={[styles.progressFill, { backgroundColor: getCategoryColor(q.category), width: `${((index + 1) / questions.length) * 100}%` }]} />
          </View>

          <Card style={{ marginTop: 16 }}>
            <View style={[styles.chip, { backgroundColor: getCategoryColor(q.category) }]}>
              <Text style={styles.chipText}>{getCategoryLabel(q.category)}</Text>
            </View>
            {q.introduction ? <Text style={{ color: c.textSecondary, marginBottom: 8 }}>{q.introduction}</Text> : null}
            <Text style={[styles.qText, { color: c.text, marginBottom: 14 }]}>{q.question}</Text>
            {q.options.map((opt, i) => {
              const isSel = selected === i;
              return (
                <Pressable
                  key={i}
                  onPress={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
                  style={[styles.option, { borderColor: isSel ? c.brand : c.border, backgroundColor: isSel ? c.brandSoft : 'transparent' }]}
                >
                  <Text style={{ color: c.text }}>{opt}</Text>
                </Pressable>
              );
            })}
          </Card>

          <View style={styles.navRow}>
            <Pressable
              onPress={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              style={[styles.navBtn, { borderColor: c.border, opacity: index === 0 ? 0.4 : 1 }]}
            >
              <Text style={{ color: c.text }}>‹</Text>
            </Pressable>
            {last ? (
              <PrimaryButton label={t('lesson.finish')} onPress={submit} disabled={!answeredAll} style={{ flex: 1, marginLeft: 12 }} />
            ) : (
              <Pressable
                onPress={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
                style={[styles.navBtn, { borderColor: c.border, flex: 1, marginLeft: 12, alignItems: 'center' }]}
              >
                <Text style={{ color: c.text }}>{t('common.continue')}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- Settings ----
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ marginBottom: 16 }}>
          <Wordmark size={22} finSize={26} />
        </View>

        <Text style={[styles.label, { color: c.textSecondary }]}>{t('quiz.categories')}</Text>
        <View style={styles.wrap}>
          {quizCategoryOptions().map((cat) => {
            const sel = categories.includes(cat.value);
            return (
              <Pressable
                key={cat.value}
                onPress={() => toggleCategory(cat.value)}
                style={[styles.catChip, { borderColor: sel ? cat.color : c.border, borderLeftColor: cat.color, borderLeftWidth: 4, backgroundColor: c.card }]}
              >
                <Text style={{ color: sel ? cat.color : c.textSecondary, fontWeight: sel ? '700' : '500' }}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: c.textSecondary, marginTop: 18 }]}>{t('quiz.difficulty')}</Text>
        <View style={styles.wrap}>
          {DIFFICULTIES.map((d) => {
            const sel = difficulty === d;
            return (
              <Pressable
                key={d}
                onPress={() => setDifficulty(d)}
                style={[styles.pill, { borderColor: sel ? c.brand : c.border, backgroundColor: sel ? c.brandSoft : c.card }]}
              >
                <Text style={{ color: sel ? c.brand : c.textSecondary }}>{t(`quiz.difficulty.${d}` as never)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: c.textSecondary, marginTop: 18 }]}>{t('quiz.questions')}</Text>
        <View style={styles.wrap}>
          {COUNTS.map((n) => {
            const sel = count === n;
            return (
              <Pressable
                key={n}
                onPress={() => setCount(n)}
                style={[styles.pill, { borderColor: sel ? c.brand : c.border, backgroundColor: sel ? c.brandSoft : c.card }]}
              >
                <Text style={{ color: sel ? c.brand : c.textSecondary }}>{n}</Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <Text style={{ color: c.error, marginTop: 16 }}>{error}</Text> : null}
        <PrimaryButton label={t('quiz.start')} onPress={start} disabled={categories.length === 0} style={{ marginTop: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 48 },
  subtle: { fontSize: 14 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderRadius: 8, minWidth: 44, alignItems: 'center' },
  qText: { fontSize: 17, fontWeight: '600', lineHeight: 24 },
  qNum: { fontSize: 12, marginBottom: 4 },
  reviewHead: { flexDirection: 'row', alignItems: 'center' },
  option: { borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 10 },
  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  navBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 18, justifyContent: 'center' },
  bigScore: { fontSize: 56, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  xpPill: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, marginTop: 10 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: 999, paddingVertical: 10, marginVertical: 16 },
  progressTrack: { height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginBottom: 10 },
  chipText: { color: '#1a1a1a', fontWeight: '700', fontSize: 12 },
});
