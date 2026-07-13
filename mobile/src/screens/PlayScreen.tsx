import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/useColors';
import { useAuth } from '../lib/auth';
import { friendlyError } from '../lib/api';
import { useT } from '../lib/i18n';
import { joinMatch, fetchMatchState, submitMatchAnswer, type Match, type ScoreboardEntry } from '../lib/playApi';
import { QuestionText } from '../components/QuestionText';
import { PrimaryButton, Card } from '../components/ui';
import { Wordmark } from '../components/SharkFin';

export default function PlayScreen() {
  const c = useColors();
  const { t } = useT();
  const { user, isAuthenticated } = useAuth();
  const uid = user?.id;
  const displayName = (user?.user_metadata?.name as string | undefined) ?? user?.email ?? 'Player';

  const [code, setCode] = useState('');
  const [match, setMatch] = useState<Match | null>(null);
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answeredIdx, setAnsweredIdx] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const qStart = useRef(Date.now());

  const join = async () => {
    if (!uid || !code.trim()) return;
    setJoining(true);
    setError(null);
    try {
      const m = await joinMatch({ code: code.trim().toUpperCase(), user_id: uid, display_name: displayName });
      setMatch(m);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setJoining(false);
    }
  };

  const matchCode = match?.code;
  useEffect(() => {
    if (!matchCode || !uid) return;
    let active = true;
    const tick = async () => {
      try {
        const s = await fetchMatchState(matchCode, uid);
        if (!active) return;
        setMatch(s.match);
        setScoreboard(s.scoreboard);
      } catch {
        // transient — keep polling
      }
    };
    void tick();
    const id = setInterval(tick, 2000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [matchCode, uid]);

  const idx = match?.current_index ?? 0;
  const status = match?.status;
  useEffect(() => {
    if (status === 'running') {
      setAnsweredIdx(null);
      setPicked(null);
      qStart.current = Date.now();
    }
  }, [idx, status]);

  const answer = async (choice: number) => {
    if (!match || !uid || answeredIdx === match.current_index) return;
    setPicked(choice);
    setAnsweredIdx(match.current_index);
    try {
      await submitMatchAnswer({
        code: match.code,
        user_id: uid,
        question_idx: match.current_index,
        selected_idx: choice,
        duration_ms: Date.now() - qStart.current,
      });
    } catch {
      // ignore — the next poll reflects the truth
    }
  };

  const leave = () => {
    setMatch(null);
    setScoreboard([]);
    setCode('');
    setError(null);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={{ marginBottom: 16 }}>
          <Wordmark size={20} finSize={24} />
        </View>

        {!isAuthenticated ? (
          <Text style={{ color: c.textSecondary }}>{t('account.signInPrompt')}</Text>
        ) : !match ? (
          <View>
            <Text style={{ color: c.textSecondary, marginBottom: 16 }}>{t('play.joinPrompt')}</Text>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              placeholder={t('play.code')}
              placeholderTextColor={c.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              style={[styles.codeInput, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
            />
            {error && <Text style={{ color: c.error, marginTop: 12 }}>{error}</Text>}
            <PrimaryButton label={t('play.join')} onPress={join} loading={joining} style={{ marginTop: 16 }} />
          </View>
        ) : match.status === 'lobby' ? (
          <Lobby c={c} code={match.code} onLeave={leave} t={t} />
        ) : match.status === 'finished' ? (
          <Results c={c} scoreboard={scoreboard} uid={uid} onLeave={leave} t={t} />
        ) : (
          <Running c={c} match={match} answered={answeredIdx === match.current_index} picked={picked} onPick={answer} t={t} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type C = ReturnType<typeof useColors>;
type T = (key: never, vars?: Record<string, string | number>) => string;

function Lobby({ c, code, onLeave, t }: { c: C; code: string; onLeave: () => void; t: T }) {
  return (
    <View style={{ alignItems: 'center', marginTop: 24 }}>
      <ActivityIndicator color={c.brand} size="large" />
      <Text style={{ color: c.text, fontWeight: '700', marginTop: 16, fontSize: 16 }}>{t('play.waiting' as never)}</Text>
      <Text style={{ color: c.textSecondary, marginTop: 4 }}>{code}</Text>
      <Pressable onPress={onLeave} style={{ marginTop: 24 }}>
        <Text style={{ color: c.textSecondary, fontWeight: '600' }}>{t('play.leave' as never)}</Text>
      </Pressable>
    </View>
  );
}

// Per-question countdown derived from the host's question_started_at +
// question_duration_s. Locks input when time runs out.
function useCountdown(startedAt?: string | null, durationS?: number): number | null {
  const [, force] = useState(0);
  useEffect(() => {
    if (!startedAt || !durationS) return;
    const id = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [startedAt, durationS]);
  if (!startedAt || !durationS) return null;
  const end = Date.parse(startedAt) + durationS * 1000;
  return Math.max(0, Math.ceil((end - Date.now()) / 1000));
}

function Running({
  c, match, answered, picked, onPick, t,
}: {
  c: C; match: Match; answered: boolean; picked: number | null; onPick: (i: number) => void; t: T;
}) {
  const q = match.questions[match.current_index];
  const remaining = useCountdown(match.question_started_at, match.question_duration_s);
  const timeUp = remaining !== null && remaining <= 0;
  const locked = answered || timeUp;
  if (!q) return <ActivityIndicator color={c.brand} style={{ marginTop: 24 }} />;
  return (
    <View>
      <View style={styles.runHead}>
        <Text style={{ color: c.textSecondary, fontWeight: '700' }}>
          {match.current_index + 1} / {match.questions.length}
        </Text>
        {remaining !== null && (
          <View style={[styles.timer, { backgroundColor: remaining <= 5 ? c.error : c.brand }]}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>{t('play.timeLeft' as never, { s: remaining })}</Text>
          </View>
        )}
      </View>
      <QuestionText text={q.question} />
      <View style={{ gap: 10, marginTop: 16 }}>
        {q.options.map((option, i) => {
          const isPicked = picked === i;
          return (
            <Pressable
              key={i}
              onPress={() => onPick(i)}
              disabled={locked}
              style={[styles.option, { borderColor: isPicked ? c.brand : c.border, backgroundColor: isPicked ? c.brandSoft : c.card, opacity: locked && !isPicked ? 0.5 : 1 }]}
            >
              <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
      {locked && (
        <Text style={{ color: c.textSecondary, textAlign: 'center', marginTop: 16 }}>{t('play.answered' as never)}</Text>
      )}
    </View>
  );
}

function Results({ c, scoreboard, uid, onLeave, t }: { c: C; scoreboard: ScoreboardEntry[]; uid?: string; onLeave: () => void; t: T }) {
  return (
    <View>
      <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>🏆</Text>
      <Text style={{ color: c.text, fontWeight: '800', fontSize: 22, textAlign: 'center', marginBottom: 16 }}>{t('play.finalScores' as never)}</Text>
      {scoreboard.map((e, i) => (
        <Card key={e.user_id} style={e.user_id === uid ? { ...styles.scoreRow, borderColor: c.brand } : styles.scoreRow}>
          <Text style={{ color: c.textSecondary, fontWeight: '800', width: 28 }}>{i + 1}</Text>
          <Text style={{ color: c.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>{e.display_name}</Text>
          <Text style={{ color: c.brand, fontWeight: '800' }}>{e.score}</Text>
        </Card>
      ))}
      <PrimaryButton label={t('play.leave' as never)} onPress={onLeave} style={{ marginTop: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 20, paddingBottom: 48 },
  codeInput: { borderWidth: 2, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, fontSize: 24, fontWeight: '800', letterSpacing: 6, textAlign: 'center' },
  option: { borderWidth: 2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  runHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  timer: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
});
