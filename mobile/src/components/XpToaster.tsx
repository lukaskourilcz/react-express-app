// Listens to the XP event bus and shows a brief animated toast for XP gains and
// rank-ups — the mobile counterpart of the web XpToaster.
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { onXpToast, type XpToast } from '../lib/xp';
import { BRAND } from '../theme';

export function XpToaster() {
  const [toast, setToast] = useState<XpToast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = onXpToast((t) => {
      setToast(t);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      opacity.setValue(0);
      translateY.setValue(20);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      ]).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => setToast(null));
      }, t.kind === 'rankup' ? 3200 : 1800);
    });
    return () => {
      unsub();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [opacity, translateY]);

  if (!toast) return null;

  const isRank = toast.kind === 'rankup';
  const label = isRank
    ? `⬆︎ ${toast.title}`
    : `+${toast.amount} XP${toast.source === 'learn' ? ' · learning' : toast.source === 'practice' ? ' · practice' : ''}`;

  return (
    <SafeAreaView pointerEvents="none" style={styles.wrap} edges={['bottom']}>
      <Animated.View
        style={[
          styles.toast,
          { backgroundColor: isRank ? BRAND.gold : BRAND.green, opacity, transform: [{ translateY }] },
        ]}
      >
        <Text style={styles.text}>{label}</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingBottom: 72 },
  toast: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  text: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
