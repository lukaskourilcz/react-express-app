import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/useColors';
import { useAuth } from '../lib/auth';
import { friendlyError } from '../lib/api';
import { joinMatch, fetchMatchState, submitMatchAnswer, type Match, type ScoreboardEntry } from '../lib/playApi';
import { QuestionText } from '../components/QuestionText';
import { PrimaryButton, Card } from '../components/ui';

export default function PlayScreen() {
  const c = useColors();
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

  // Poll the match state while we're in a match that hasn't finished.
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

  // Reset the per-question answer state whenever the host advances.
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
        <Text style={[styles.title, { color: c.text }]}>Play</Text>

        {!isAuthenticated ? (
          <Text style={{ color: c.textSecondary }}>Sign in (Account tab) to join a live match.</Text>
        ) : !match ? (
          <View>
            <Text style={{ color: c.textSecondary, marginBottom: 16 }}>
              Enter the room code from the host to join a live quiz.
            </Text>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              placeholder="CODE"
              placeholderTextColor={c.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              style={[styles.codeInput, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
            />
            {error && <Text style={{ color: c.error, marginTop: 12 }}>{error}</Text>}
            <PrimaryButton label="Join match" onPress={join} loading={joining} style={{ marginTop: 16 }} />
          </View>
        ) : match.status === 'lobby' ? (
          <Lobby c={c} code={match.code} onLeave={leave} />
        ) : match.status === 'finished' ? (
          <Results c={c} scoreboard={scoreboard} uid={uid} onLeave={leave} />
        ) : (
          <Running
            c={c}
            match={match}
            answered={answeredIdx === match.current_index}
            picked={picked}
            onPick={answer}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type C = ReturnType<typeof useColors>;

function Lobby({ c, code, onLeave }: { c: C; code: string; onLeave: () => void }) {
  return (
    <View style={{ alignItems: 'center', marginTop: 24 }}>
      <ActivityIndicator color={c.brand} size="large" />
      <Text style={{ color: c.text, fontWeight: '700', marginTop: 16, fontSize: 16 }}>Waiting for the host to start…</Text>
      <Text style={{ color: c.textSecondary, marginTop: 4 }}>Room {code}</Text>
      <Pressable onPress={onLeave} style={{ marginTop: 24 }}>
        <Text style={{ color: c.textSecondary, fontWeight: '600' }}>Leave</Text>
      </Pressable>
    </View>
  );
}

function Running({
  c, match, answered, picked, onPick,
}: {
  c: C; match: Match; answered: boolean; picked: number | null; onPick: (i: number) => void;
}) {
  const q = match.questions[match.current_index];
  if (!q) return <ActivityIndicator color={c.brand} style={{ marginTop: 24 }} />;
  return (
    <View>
      <Text style={{ color: c.textSecondary, fontWeight: '700', marginBottom: 8 }}>
        Question {match.current_index + 1} of {match.questions.length}
      </Text>
      <QuestionText text={q.question} />
      <View style={{ gap: 10, marginTop: 16 }}>
        {q.options.map((option, i) => {
          const isPicked = picked === i;
          return (
            <Pressable
              key={i}
              onPress={() => onPick(i)}
              disabled={answered}
              style={[
                styles.option,
                {
                  borderColor: isPicked ? c.brand : c.border,
                  backgroundColor: isPicked ? c.brandSoft : c.card,
                  opacity: answered && !isPicked ? 0.5 : 1,
                },
              ]}
            >
              <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
      {answered && (
        <Text style={{ color: c.textSecondary, textAlign: 'center', marginTop: 16 }}>
          Answer locked in — waiting for the next question…
        </Text>
      )}
    </View>
  );
}

function Results({ c, scoreboard, uid, onLeave }: { c: C; scoreboard: ScoreboardEntry[]; uid?: string; onLeave: () => void }) {
  return (
    <View>
      <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>🏆</Text>
      <Text style={{ color: c.text, fontWeight: '800', fontSize: 22, textAlign: 'center', marginBottom: 16 }}>
        Final scores
      </Text>
      {scoreboard.map((e, i) => (
        <Card key={e.user_id} style={e.user_id === uid ? { ...styles.scoreRow, borderColor: c.brand } : styles.scoreRow}>
          <Text style={{ color: c.textSecondary, fontWeight: '800', width: 28 }}>{i + 1}</Text>
          <Text style={{ color: c.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>
            {e.display_name}
          </Text>
          <Text style={{ color: c.brand, fontWeight: '800' }}>{e.score}</Text>
        </Card>
      ))}
      <PrimaryButton label="Leave" onPress={onLeave} style={{ marginTop: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 16 },
  codeInput: { borderWidth: 2, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, fontSize: 24, fontWeight: '800', letterSpacing: 6, textAlign: 'center' },
  option: { borderWidth: 2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
});
