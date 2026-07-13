// devShark branding for React Native: the dorsal-fin glyph (same SVG path as the
// web client's SharkFin) and the "devShark" wordmark used in screen headers.
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BRAND } from '../theme';
import { useColors } from '../lib/useColors';

export function SharkFin({ size = 22, color = BRAND.green }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 18 Q 6 6 15 3 Q 17 11 21 18 Z" fill={color} />
      {/* subtle inner shading down the trailing edge */}
      <Path d="M15 3 Q 17 11 21 18 L 16 18 Q 14 10 15 3 Z" fill="#000" opacity={0.12} />
    </Svg>
  );
}

/** The "🦈 devShark" lockup used in headers. */
export function Wordmark({ size = 20, finSize = 22 }: { size?: number; finSize?: number }) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <SharkFin size={finSize} color={c.brand} />
      <Text style={[styles.word, { color: c.text, fontSize: size }]}>devShark</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  word: { fontWeight: '800', letterSpacing: 0.2 },
});
