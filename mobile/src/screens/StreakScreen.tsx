import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/useColors';
import { useStreak } from '../lib/streak';
import { isWidgetSupported } from '../lib/widget';
import { Garden } from '../components/Garden';
import { Card } from '../components/ui';

export default function StreakScreen() {
  const c = useColors();
  const streak = useStreak();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.title, { color: c.text }]}>Streak</Text>

        <View style={styles.flameRow}>
          <Ionicons name="flame" size={64} color={streak.current > 0 ? '#ff6d00' : c.textSecondary} />
          <View>
            <Text style={[styles.bigNum, { color: c.text }]}>{streak.current}</Text>
            <Text style={{ color: c.textSecondary, fontWeight: '600' }}>
              day{streak.current === 1 ? '' : 's'} streak
            </Text>
          </View>
        </View>

        <Text style={[styles.tip, { color: c.textSecondary }]}>
          {streak.activeToday
            ? "Nice — you've practiced today! 🌱"
            : 'Complete a lesson today to keep your streak alive.'}
        </Text>

        <Card style={{ marginTop: 16 }}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Your garden</Text>
          <Text style={{ color: c.textSecondary, marginBottom: 12, fontSize: 13 }}>
            Each tile is a day — greener the more you learn.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Garden garden={streak.garden} />
          </ScrollView>
        </Card>

        <View style={styles.statsRow}>
          <Card style={styles.stat}>
            <Text style={[styles.statNum, { color: c.text }]}>{streak.longest}</Text>
            <Text style={{ color: c.textSecondary }}>Longest streak</Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={[styles.statNum, { color: c.text }]}>
              {streak.garden.filter((d) => d.count > 0).length}
            </Text>
            <Text style={{ color: c.textSecondary }}>Active days</Text>
          </Card>
        </View>

        <Text style={[styles.widgetNote, { color: c.textSecondary }]}>
          {isWidgetSupported()
            ? 'Add the DevQuiz widget to your Home Screen to watch your garden grow.'
            : 'Home Screen widget available in the installed app (not Expo Go).'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 12 },
  flameRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bigNum: { fontSize: 44, fontWeight: '800', lineHeight: 48 },
  tip: { marginTop: 8, fontSize: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '800' },
  widgetNote: { marginTop: 20, fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
