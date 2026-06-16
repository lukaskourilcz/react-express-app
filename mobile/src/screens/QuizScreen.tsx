import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/useColors';
import { CATEGORY_OPTIONS, getCategoryColor, getCategoryLabel } from '../lib/categories';
import { fetchQuestions, submitQuiz } from '../lib/quizApi';
import { friendlyError } from '../lib/api';
import type { CategoryType, DifficultyMode, Question, QuizResult } from '../types';
import { PrimaryButton, Card, LoadingScreen } from '../components/ui';

type Phase = 'settings' | 'loading' | 'in-progress' | 'submitted' | 'error';

const DIFFICULTIES: { value: DifficultyMode; label: string }[] = [
  { value: 'basics', label: 'Basics' },
  { value: 'easy', label: 'Easy' },
  { value: 'zero-to-hero', label: 'Progressive' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'mixed', label: 'Mixed' },
];

const COUNTS = [5, 10, 15, 20];

export default function QuizScreen() {
  const c = useColors();
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

  const toggleCategory = (cat: CategoryType) =>
    setCategories((prev) => (prev.includes(cat) ? prev.filter((x) => x !== cat) : [...prev, cat]));

  const start = async () => {
    if (categories.length === 0) {
      setError('Select at least one category.');
      return;
    }
    setPhase('loading');
    setError(null);
    try {
      const data = await fetchQuestions({ count, difficulty, categories });
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
      const data = await submitQuiz(sessionId, answers);
      setResult(data);
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

  // ---- Loading ----
  if (phase === 'loading') {
    return <LoadingScreen />;
  }

  // ---- Error ----
  if (phase === 'error') {
    return (
      <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: c.background }]}>
        <Text style={{ color: c.error, marginBottom: 16, textAlign: 'center' }}>{error}</Text>
        <PrimaryButton label="Back" onPress={reset} />
      </SafeAreaView>
    );
  }

  // ---- Results ----
  if (phase === 'submitted' && result) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.bigScore, { color: c.brand }]}>{result.percentage}%</Text>
          <Text style={[styles.subtle, { color: c.textSecondary, textAlign: 'center', marginBottom: 20 }]}>
            {result.correctAnswers} / {result.totalQuestions} correct
          </Text>
          {questions.map((q, i) => {
            const r = result.results.find((x) => x.questionId === q.id);
            const ok = r?.isCorrect;
            return (
              <Card key={q.id} style={{ marginBottom: 12, borderLeftWidth: 4, borderLeftColor: ok ? c.success : c.error }}>
                <Text style={[styles.qNum, { color: c.textSecondary }]}>
                  {i + 1}. {getCategoryLabel(q.category)} · {ok ? 'Correct' : 'Incorrect'}
                </Text>
                <Text style={[styles.qText, { color: c.text }]}>{q.question}</Text>
                {r && r.correctAnswer >= 0 && (
                  <Text style={{ color: c.brand, marginTop: 6 }}>Answer: {q.options[r.correctAnswer]}</Text>
                )}
                {r?.explanation ? (
                  <Text style={{ color: c.textSecondary, marginTop: 6 }}>{r.explanation}</Text>
                ) : null}
              </Card>
            );
          })}
          <PrimaryButton label="Play again" onPress={reset} style={{ marginTop: 8 }} />
        </ScrollView>
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
            Question {index + 1} of {questions.length}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: getCategoryColor(q.category), width: `${((index + 1) / questions.length) * 100}%` },
              ]}
            />
          </View>

          <Card style={{ marginTop: 16 }}>
            <View style={[styles.chip, { backgroundColor: getCategoryColor(q.category) }]}>
              <Text style={styles.chipText}>{getCategoryLabel(q.category)}</Text>
            </View>
            {q.introduction ? (
              <Text style={{ color: c.textSecondary, marginBottom: 8 }}>{q.introduction}</Text>
            ) : null}
            <Text style={[styles.qText, { color: c.text, marginBottom: 14 }]}>{q.question}</Text>

            {q.options.map((opt, i) => {
              const isSel = selected === i;
              return (
                <Pressable
                  key={i}
                  onPress={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
                  style={[
                    styles.option,
                    { borderColor: isSel ? c.brand : c.border, backgroundColor: isSel ? c.brandSoft : 'transparent' },
                  ]}
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
              <Text style={{ color: c.text }}>Previous</Text>
            </Pressable>
            {last ? (
              <PrimaryButton
                label="Submit"
                onPress={submit}
                disabled={!answeredAll}
                style={{ flex: 1, marginLeft: 12 }}
              />
            ) : (
              <Pressable
                onPress={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
                style={[styles.navBtn, { borderColor: c.border, flex: 1, marginLeft: 12, alignItems: 'center' }]}
              >
                <Text style={{ color: c.text }}>Next</Text>
              </Pressable>
            )}
          </View>
          {last && !answeredAll && (
            <Text style={{ color: c.textSecondary, textAlign: 'center', marginTop: 8 }}>
              Answer every question to submit.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- Settings ----
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.h1, { color: c.text }]}>DevQuiz</Text>
        <Text style={[styles.subtle, { color: c.textSecondary, marginBottom: 20 }]}>
          Pick your topics and start a quiz.
        </Text>

        <Text style={[styles.label, { color: c.textSecondary }]}>Categories</Text>
        <View style={styles.wrap}>
          {CATEGORY_OPTIONS.map((cat) => {
            const sel = categories.includes(cat.value);
            return (
              <Pressable
                key={cat.value}
                onPress={() => toggleCategory(cat.value)}
                style={[
                  styles.catChip,
                  {
                    borderColor: sel ? cat.color : c.border,
                    borderLeftColor: cat.color,
                    borderLeftWidth: 4,
                    backgroundColor: c.card,
                  },
                ]}
              >
                <Text style={{ color: sel ? cat.color : c.textSecondary, fontWeight: sel ? '700' : '500' }}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: c.textSecondary, marginTop: 18 }]}>Difficulty</Text>
        <View style={styles.wrap}>
          {DIFFICULTIES.map((d) => {
            const sel = difficulty === d.value;
            return (
              <Pressable
                key={d.value}
                onPress={() => setDifficulty(d.value)}
                style={[styles.pill, { borderColor: sel ? c.brand : c.border, backgroundColor: sel ? c.brandSoft : c.card }]}
              >
                <Text style={{ color: sel ? c.brand : c.textSecondary }}>{d.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: c.textSecondary, marginTop: 18 }]}>Questions</Text>
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

        <PrimaryButton label="Start quiz" onPress={start} disabled={categories.length === 0} style={{ marginTop: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 48 },
  h1: { fontSize: 28, fontWeight: '800' },
  subtle: { fontSize: 14 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderRadius: 8, minWidth: 44, alignItems: 'center' },
  qText: { fontSize: 17, fontWeight: '600', lineHeight: 24 },
  qNum: { fontSize: 12, marginBottom: 4 },
  option: { borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 10 },
  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  navBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 18, justifyContent: 'center' },
  bigScore: { fontSize: 56, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  progressTrack: { height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginBottom: 10 },
  chipText: { color: '#1a1a1a', fontWeight: '700', fontSize: 12 },
});
