// In-app token Shop: boosters, cosmetics (rings/flairs) and path unlocks.
// Purchases, equips and the token balance all read from reactive lib hooks.
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/useColors';
import { useT } from '../lib/i18n';
import { PrimaryButton, Card } from '../components/ui';
import { Wordmark } from '../components/SharkFin';
import { useTokens } from '../lib/tokens';
import { getCategoryLabel } from '../lib/categories';
import {
  CATALOGUE,
  priceOf,
  purchase,
  equip,
  useInventory,
  isPathAlreadyUnlocked,
  type Product,
} from '../lib/shop';

type C = ReturnType<typeof useColors>;

// Per-item display names — no i18n keys exist per catalogue item.
const NAMES: Record<string, string> = {
  'double-xp': '⚡ Double XP',
  'ring-emerald': 'Emerald ring',
  'ring-gold': 'Gold ring',
  'ring-violet': 'Violet ring',
  'flair-rocket': 'Rocket',
  'flair-flame': 'Flame',
  'flair-crown': 'Crown',
};

const displayName = (p: Product): string => {
  if (p.kind === 'path') return `Unlock ${getCategoryLabel(p.topic!)}`;
  return NAMES[p.id] ?? p.id;
};

export default function ShopScreen() {
  const c = useColors();
  const router = useRouter();
  const { t } = useT();
  const tokens = useTokens();
  const inv = useInventory();

  // Transient per-item feedback ('ok' flashes success, 'insufficient' warns).
  const [flash, setFlash] = useState<Record<string, 'ok' | 'insufficient'>>({});

  const buy = useCallback((id: string) => {
    const result = purchase(id);
    if (result === 'ok' || result === 'insufficient') {
      setFlash((prev) => ({ ...prev, [id]: result }));
      setTimeout(() => {
        setFlash((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 1600);
    }
  }, []);

  const boosters = CATALOGUE.filter((p) => p.kind === 'booster');
  const cosmetics = CATALOGUE.filter((p) => p.kind === 'ring' || p.kind === 'flair');
  const paths = CATALOGUE.filter((p) => p.kind === 'path');

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={26} color={c.text} />
        </Pressable>
        <Wordmark size={18} finSize={20} />
        <View style={styles.tokenPill}>
          <Text style={[styles.tokenText, { color: c.gold, borderColor: c.border, backgroundColor: c.brandSoft }]}>
            {t('shop.tokens', { n: tokens })}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.h1, { color: c.text }]}>{t('shop.title')}</Text>

        {/* Boosters */}
        <Text style={[styles.section, { color: c.textSecondary }]}>{t('shop.boosters')}</Text>
        {boosters.map((p) => (
          <Card key={p.id} style={styles.row}>
            <Text style={styles.rowEmoji}>{p.emoji}</Text>
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: c.text }]}>{displayName(p)}</Text>
              <Text style={{ color: c.textSecondary, fontSize: 13 }}>
                {t('shop.charges', { n: inv.doubleXp })}
              </Text>
            </View>
            <BuyControl c={c} t={t} price={priceOf(p)} flash={flash[p.id]} onBuy={() => buy(p.id)} />
          </Card>
        ))}

        {/* Cosmetics */}
        <Text style={[styles.section, { color: c.textSecondary }]}>{t('shop.cosmetics')}</Text>
        {cosmetics.map((p) => {
          const owned = inv.owned.includes(p.id);
          const equipped = p.kind === 'ring' ? inv.ring === p.id : inv.flair === p.id;
          return (
            <Card key={p.id} style={styles.row}>
              {p.kind === 'ring' ? (
                <View style={[styles.dot, { backgroundColor: p.color ?? c.brand, borderColor: c.border }]} />
              ) : (
                <Text style={styles.rowEmoji}>{p.emoji}</Text>
              )}
              <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: c.text }]}>{displayName(p)}</Text>
                {owned && (
                  <Text style={{ color: equipped ? c.success : c.textSecondary, fontSize: 13 }}>
                    {equipped ? t('shop.equipped') : t('shop.owned')}
                  </Text>
                )}
              </View>
              {owned ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => equip(p.id)}
                  style={({ pressed }) => [
                    styles.equipBtn,
                    {
                      borderColor: equipped ? c.success : c.border,
                      backgroundColor: equipped ? c.success : c.card,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: equipped ? '#fff' : c.text, fontWeight: '700' }}>
                    {equipped ? t('shop.equipped') : t('shop.equip')}
                  </Text>
                </Pressable>
              ) : (
                <BuyControl c={c} t={t} price={priceOf(p)} flash={flash[p.id]} onBuy={() => buy(p.id)} />
              )}
            </Card>
          );
        })}

        {/* Unlock paths */}
        <Text style={[styles.section, { color: c.textSecondary }]}>{t('shop.paths')}</Text>
        <Text style={[styles.hint, { color: c.textSecondary }]}>{t('shop.unlockHint')}</Text>
        {paths.map((p) => {
          const unlocked = p.topic ? isPathAlreadyUnlocked(p.topic) : false;
          return (
            <Card key={p.id} style={{ ...styles.row, borderLeftWidth: 4, borderLeftColor: p.color ?? c.brand }}>
              <Text style={styles.rowEmoji}>{p.emoji}</Text>
              <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: c.text }]}>{displayName(p)}</Text>
              </View>
              {unlocked ? (
                <View style={[styles.equipBtn, { borderColor: c.border, backgroundColor: c.card, opacity: 0.6 }]}>
                  <Text style={{ color: c.textSecondary, fontWeight: '700' }}>{t('shop.owned')}</Text>
                </View>
              ) : (
                <BuyControl c={c} t={t} price={priceOf(p)} flash={flash[p.id]} onBuy={() => buy(p.id)} />
              )}
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function BuyControl({
  c,
  t,
  price,
  flash,
  onBuy,
}: {
  c: C;
  t: ReturnType<typeof useT>['t'];
  price: number;
  flash: 'ok' | 'insufficient' | undefined;
  onBuy: () => void;
}) {
  if (flash === 'ok') {
    return (
      <View style={[styles.buyBtn, styles.flashBox, { backgroundColor: c.success }]}>
        <Text style={styles.flashText}>{t('shop.purchased')}</Text>
      </View>
    );
  }
  if (flash === 'insufficient') {
    return (
      <View style={[styles.buyBtn, styles.flashBox, { backgroundColor: c.error }]}>
        <Text style={styles.flashText}>{t('shop.insufficient')}</Text>
      </View>
    );
  }
  return (
    <PrimaryButton label={`${t('shop.buy')} · ${price}`} onPress={onBuy} style={styles.buyBtn} />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  closeBtn: { padding: 2 },
  tokenPill: { alignItems: 'flex-end' },
  tokenText: {
    fontWeight: '800',
    fontSize: 13,
    overflow: 'hidden',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  body: { padding: 20, paddingTop: 4 },
  h1: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  section: {
    marginTop: 24,
    marginBottom: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  hint: { fontSize: 13, marginBottom: 12, marginTop: -4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  rowMain: { flex: 1 },
  rowEmoji: { fontSize: 26 },
  rowTitle: { fontWeight: '700', fontSize: 16 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1 },
  buyBtn: { paddingVertical: 10, paddingHorizontal: 16, minWidth: 96 },
  flashBox: { borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  flashText: { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  equipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 2,
    minWidth: 96,
    alignItems: 'center',
  },
});
