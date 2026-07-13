// devShark mobile Home/landing hub — the mobile counterpart of the web app's
// rich landing page. Branded hero, an optional career snapshot for signed-in
// users, and four CTA cards routing into the app's core flows.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Wordmark, SharkFin } from '../components/SharkFin';
import { Card } from '../components/ui';
import { useColors } from '../lib/useColors';
import { useT } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { useLevelInfo } from '../lib/xp';
import { useTokens } from '../lib/tokens';

type Cta = {
  key: 'learn' | 'quiz' | 'challenge' | 'play';
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  accent: (c: ReturnType<typeof useColors>) => string;
};

const CTAS: Cta[] = [
  { key: 'learn', icon: 'school', route: '/(tabs)', accent: (c) => c.brand },
  { key: 'quiz', icon: 'flash', route: '/(tabs)/quiz', accent: (c) => c.ocean },
  { key: 'challenge', icon: 'trophy', route: '/challenge', accent: (c) => c.gold },
  { key: 'play', icon: 'game-controller', route: '/(tabs)/play', accent: (c) => c.coral },
];

export default function HomeScreen() {
  const c = useColors();
  const router = useRouter();
  const { t } = useT();
  const { isAuthenticated } = useAuth();

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="close" size={22} color={c.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.finBadge, { backgroundColor: c.brandSoft }]}>
            <SharkFin size={92} color={c.brand} />
          </View>
          <Wordmark size={30} finSize={30} />
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>{t('home.subtitle')}</Text>
        </View>

        {/* Career snapshot */}
        {isAuthenticated && <CareerCard c={c} t={t} />}

        {/* CTA grid */}
        <View style={styles.grid}>
          {CTAS.map((cta) => {
            const accent = cta.accent(c);
            return (
              <Pressable
                key={cta.key}
                accessibilityRole="button"
                onPress={() => router.push(cta.route as any)}
                style={styles.gridItem}
              >
                <Card style={styles.ctaCard}>
                  <View style={[styles.ctaIcon, { backgroundColor: accent + '22' }]}>
                    <Ionicons name={cta.icon} size={26} color={accent} />
                  </View>
                  <Text style={[styles.ctaLabel, { color: c.text }]}>{t(`home.cta.${cta.key}`)}</Text>
                </Card>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.footer, { color: c.textSecondary }]}>{t('home.free')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function CareerCard({ c, t }: { c: ReturnType<typeof useColors>; t: ReturnType<typeof useT>['t'] }) {
  const info = useLevelInfo();
  const tokens = useTokens();

  return (
    <Card style={styles.career}>
      <View style={styles.careerHead}>
        <Text style={styles.rankEmoji}>{info.rank.emoji}</Text>
        <View style={styles.flex}>
          <Text style={[styles.rankTitle, { color: c.text }]}>{info.rank.title}</Text>
          <Text style={{ color: c.textSecondary, fontSize: 13 }}>Level {info.level}</Text>
        </View>
        <View style={styles.careerMetrics}>
          <Text style={[styles.xpValue, { color: c.brand }]}>{info.totalXp + ' XP'}</Text>
          <View style={styles.tokenRow}>
            <Ionicons name="server" size={13} color={c.gold} />
            <Text style={{ color: c.goldDark, fontWeight: '700', fontSize: 13 }}>
              {tokens} {t('account.tokens')}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.track, { backgroundColor: c.brandSoft }]}>
        <View style={[styles.trackFill, { width: `${info.progressPct}%`, backgroundColor: c.brand }]} />
      </View>

      <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 8 }}>
        {info.isMax
          ? t('account.maxRank')
          : t('account.nextRank', { xp: info.xpToNext, rank: info.next!.title })}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', marginTop: 8, marginBottom: 28 },
  finBadge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  subtitle: { fontSize: 16, textAlign: 'center', marginTop: 10, lineHeight: 22, maxWidth: 320 },
  career: { marginBottom: 24 },
  careerHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankEmoji: { fontSize: 34 },
  rankTitle: { fontSize: 17, fontWeight: '800' },
  careerMetrics: { alignItems: 'flex-end', gap: 4 },
  xpValue: { fontSize: 16, fontWeight: '800' },
  tokenRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  track: { height: 8, borderRadius: 999, marginTop: 14, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 999 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gridItem: { flexBasis: '47%', flexGrow: 1 },
  ctaCard: { alignItems: 'flex-start', gap: 14, minHeight: 120, justifyContent: 'space-between' },
  ctaIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ctaLabel: { fontSize: 16, fontWeight: '700' },
  footer: { textAlign: 'center', marginTop: 28, fontSize: 13 },
});
