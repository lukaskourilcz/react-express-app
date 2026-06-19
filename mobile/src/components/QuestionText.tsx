// Renders roadmap question text, which may embed fenced ```code``` blocks and
// inline `code`. Code is shown in a monospaced, tinted box; prose flows normally.
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../lib/useColors';

const FENCE = /```[a-zA-Z]*\n?([\s\S]*?)```/g;

export function QuestionText({ text, size = 16 }: { text: string; size?: number }) {
  const c = useColors();
  // Split into alternating prose / code segments.
  const segments: { code: boolean; value: string }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  FENCE.lastIndex = 0;
  while ((m = FENCE.exec(text)) !== null) {
    if (m.index > last) segments.push({ code: false, value: text.slice(last, m.index) });
    segments.push({ code: true, value: m[1].replace(/\n$/, '') });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ code: false, value: text.slice(last) });

  return (
    <View>
      {segments.map((seg, i) =>
        seg.code ? (
          <View key={i} style={[styles.codeBlock, { backgroundColor: c.brandSoft, borderColor: c.border }]}>
            <Text style={[styles.codeText, { color: c.text }]}>{seg.value}</Text>
          </View>
        ) : (
          <Prose key={i} value={seg.value.trim()} color={c.text} mono={c.brand} size={size} />
        ),
      )}
    </View>
  );
}

// Prose with inline `code` spans rendered in monospace.
function Prose({ value, color, mono, size }: { value: string; color: string; mono: string; size: number }) {
  if (!value) return null;
  const parts = value.split('`');
  return (
    <Text style={{ color, fontSize: size, lineHeight: size * 1.4 }}>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={[styles.inlineCode, { color: mono }]}>
            {p}
          </Text>
        ) : (
          <Text key={i}>{p}</Text>
        ),
      )}
    </Text>
  );
}

const mono = { ios: 'Menlo', default: 'monospace' } as const;

const styles = StyleSheet.create({
  codeBlock: { borderWidth: 1, borderRadius: 10, padding: 12, marginVertical: 6 },
  codeText: { fontFamily: mono.ios, fontSize: 13.5, lineHeight: 20 },
  inlineCode: { fontFamily: mono.ios, fontSize: 14 },
});
