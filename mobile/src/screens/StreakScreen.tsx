import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/useColors';
import { useStreak } from '../lib/streak';
import { isWidgetSupported } from '../lib/widget';
import { useT } from '../lib/i18n';
import { Garden } from '../components/Garden';
import { Card } from '../components/ui';

export default function StreakScreen() {
  const c = useColors();
  const streak = useStreak();
  const { t } = useT();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.title, { color: c.text }]}>{t('streak.title')}</Text>

        <View style={styles.flameRow}>
          <Ionicons name="flame" size={64} color={streak.current > 0 ? '#ff6d00' : c.textSecondary} />
          <View>
            <Text style={[styles.bigNum, { color: c.text }]}>{streak.current}</Text>
            <Text style={{ color: c.textSecondary, fontWeight: '600' }}>{t('streak.days')}</Text>
          </View>
        </View>

        <Text style={[styles.tip, { color: c.textSecondary }]}>
          {streak.activeToday ? t('streak.todayDone') : t('streak.todayTodo')}
        </Text>

        <Card style={{ marginTop: 16 }}>
          <Text style={[styles.cardTitle, { color: c.text }]}>{t('streak.garden')}</Text>
          <Text style={{ color: c.textSecondary, marginBottom: 12, fontSize: 13 }}>{t('streak.gardenSub')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Garden garden={streak.garden} />
          </ScrollView>
        </Card>

        <View style={styles.statsRow}>
          <Card style={styles.stat}>
            <Text style={[styles.statNum, { color: c.text }]}>{streak.longest}</Text>
            <Text style={{ color: c.textSecondary }}>{t('streak.longest')}</Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={[styles.statNum, { color: c.text }]}>
              {streak.garden.filter((d) => d.count > 0).length}
            </Text>
            <Text style={{ color: c.textSecondary }}>{t('streak.activeDays')}</Text>
          </Card>
        </View>

        <Text style={[styles.widgetNote, { color: c.textSecondary }]}>
          {isWidgetSupported() ? t('streak.widgetAdd') : t('streak.widgetGo')}
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
