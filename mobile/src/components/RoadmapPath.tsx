// The serpentine "snake" learning path, restructured for phone widths (2–3
// columns measured from the layout). Connectors are drawn with react-native-svg
// through the node centres; nodes are tappable raised "bubbles".
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/useColors';
import type { RoadmapLevelMeta, RoadmapCheckpointMeta, RoadmapTopic } from '../lib/roadmapApi';
import {
  type RoadmapProgress,
  isLevelUnlocked,
  isLevelPassed,
  levelBestPct,
  isCheckpointUnlocked,
  isCheckpointPassed,
  LEVELS_PER_CHECKPOINT,
} from '../lib/roadmapProgress';

const GOLD = '#ffb300';
const GOLD_DARK = '#e08e00';
// Rainbow by difficulty tier (1→5), matching the web path.
const BANDS: [string, string][] = [
  ['#58cc02', '#46a302'],
  ['#15b3f0', '#0a8fd6'],
  ['#a560f0', '#8a3ff0'],
  ['#ff9600', '#e67e00'],
  ['#ff4b4b', '#e23b3b'],
];
const bandFor = (d: number): [string, string] => BANDS[Math.min(5, Math.max(1, d)) - 1];

type Node =
  | { type: 'level'; meta: RoadmapLevelMeta }
  | { type: 'checkpoint'; meta: RoadmapCheckpointMeta };

function buildPath(levels: RoadmapLevelMeta[], checkpoints: RoadmapCheckpointMeta[]): Node[] {
  const out: Node[] = [];
  for (const meta of levels) {
    out.push({ type: 'level', meta });
    if (meta.level % LEVELS_PER_CHECKPOINT === 0) {
      const cp = checkpoints.find((c) => c.afterLevel === meta.level);
      if (cp) out.push({ type: 'checkpoint', meta: cp });
    }
  }
  return out;
}

export function RoadmapPath({
  topic,
  levels,
  checkpoints,
  progress,
  onOpenLevel,
  onOpenCheckpoint,
}: {
  topic: RoadmapTopic;
  levels: RoadmapLevelMeta[];
  checkpoints: RoadmapCheckpointMeta[];
  progress: RoadmapProgress;
  onOpenLevel: (level: number) => void;
  onOpenCheckpoint: (cp: number) => void;
}) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const nodes = buildPath(levels, checkpoints);
  const cols = width < 360 ? 2 : 3;
  const cellW = width > 0 ? width / cols : 0;
  const ROW_H = 132;
  const SLOPE = 10;
  const BASE = 46;
  const LABEL_H = 46;

  const placed = nodes.map((node, i) => {
    const row = Math.floor(i / cols);
    const p = i % cols;
    const colVisual = row % 2 === 0 ? p : cols - 1 - p;
    const cx = colVisual * cellW + cellW / 2;
    const cy = BASE + row * ROW_H + p * SLOPE;
    return { node, i, cx, cy };
  });
  const rows = Math.ceil(nodes.length / cols);
  const height = BASE + (rows - 1) * ROW_H + (cols - 1) * SLOPE + 40 + LABEL_H;

  return (
    <View onLayout={onLayout} style={{ width: '100%', height: width > 0 ? height : 240 }}>
      {width > 0 && (
        <>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            {placed.slice(0, -1).map((a, i) => {
              const b = placed[i + 1];
              const aPassed = a.node.type === 'level'
                ? isLevelPassed(progress, topic, a.node.meta.level)
                : isCheckpointPassed(progress, topic, a.node.meta.checkpoint);
              const bPassed = b.node.type === 'level'
                ? isLevelPassed(progress, topic, b.node.meta.level)
                : isCheckpointPassed(progress, topic, b.node.meta.checkpoint);
              const done = aPassed && bPassed;
              const stroke = done
                ? b.node.type === 'checkpoint'
                  ? GOLD
                  : bandFor(b.node.type === 'level' ? b.node.meta.difficulty : 1)[0]
                : c.border;
              return <Line key={i} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} stroke={stroke} strokeWidth={6} strokeLinecap="round" />;
            })}
          </Svg>
          {placed.map(({ node, cx, cy }) =>
            node.type === 'checkpoint' ? (
              <CheckpointBubble
                key={`cp-${node.meta.checkpoint}`}
                cp={node.meta}
                cx={cx}
                cy={cy}
                cellW={cellW}
                unlocked={isCheckpointUnlocked(progress, topic, node.meta.checkpoint)}
                passed={isCheckpointPassed(progress, topic, node.meta.checkpoint)}
                onPress={() => onOpenCheckpoint(node.meta.checkpoint)}
              />
            ) : (
              <LevelBubble
                key={`lvl-${node.meta.level}`}
                meta={node.meta}
                cx={cx}
                cy={cy}
                cellW={cellW}
                unlocked={isLevelUnlocked(progress, topic, node.meta.level)}
                passed={isLevelPassed(progress, topic, node.meta.level)}
                best={levelBestPct(progress, topic, node.meta.level)}
                onPress={() => onOpenLevel(node.meta.level)}
              />
            ),
          )}
        </>
      )}
    </View>
  );
}

const NODE = 58;
const CP = 72;

function LevelBubble({
  meta, cx, cy, cellW, unlocked, passed, best, onPress,
}: {
  meta: RoadmapLevelMeta; cx: number; cy: number; cellW: number;
  unlocked: boolean; passed: boolean; best: number; onPress: () => void;
}) {
  const c = useColors();
  const [light, dark] = bandFor(meta.difficulty);
  const isCurrent = unlocked && !passed;
  const stars = passed ? (best >= 100 ? 3 : best >= 75 ? 2 : 1) : 0;
  return (
    <View style={[styles.nodeWrap, { left: cx - cellW / 2, top: cy - NODE / 2, width: cellW }]}>
      <Pressable
        onPress={unlocked ? onPress : undefined}
        disabled={!unlocked}
        accessibilityRole="button"
        accessibilityLabel={`Level ${meta.level}: ${meta.title}${unlocked ? '' : ' (locked)'}`}
        style={({ pressed }) => [
          styles.bubble,
          {
            width: NODE, height: NODE, borderRadius: NODE / 2,
            backgroundColor: passed ? light : c.card,
            borderColor: passed || isCurrent ? dark : c.border,
            shadowColor: passed || isCurrent ? dark : '#000',
            transform: [{ translateY: pressed ? 3 : 0 }],
            opacity: unlocked ? 1 : 0.55,
          },
        ]}
      >
        {passed ? (
          <Ionicons name="checkmark" size={28} color="#fff" />
        ) : unlocked ? (
          <Text style={[styles.nodeNum, { color: dark }]}>{meta.level}</Text>
        ) : (
          <Ionicons name="lock-closed" size={20} color={c.textSecondary} />
        )}
      </Pressable>
      {passed && (
        <View style={styles.stars}>
          {[0, 1, 2].map((s) => (
            <Ionicons key={s} name="star" size={11} color={s < stars ? '#ffc400' : c.border} />
          ))}
        </View>
      )}
      <Text numberOfLines={2} style={[styles.label, { color: unlocked ? c.text : c.textSecondary }]}>
        {meta.title}
      </Text>
    </View>
  );
}

function CheckpointBubble({
  cp, cx, cy, cellW, unlocked, passed, onPress,
}: {
  cp: RoadmapCheckpointMeta; cx: number; cy: number; cellW: number;
  unlocked: boolean; passed: boolean; onPress: () => void;
}) {
  const c = useColors();
  const isCurrent = unlocked && !passed;
  return (
    <View style={[styles.nodeWrap, { left: cx - cellW / 2, top: cy - CP / 2, width: cellW }]}>
      <Pressable
        onPress={unlocked ? onPress : undefined}
        disabled={!unlocked}
        accessibilityRole="button"
        accessibilityLabel={`Checkpoint: ${cp.title}${unlocked ? '' : ' (locked)'}`}
        style={({ pressed }) => [
          styles.bubble,
          {
            width: CP, height: CP, borderRadius: 20,
            backgroundColor: passed ? GOLD : c.card,
            borderColor: passed || isCurrent ? GOLD_DARK : c.border,
            shadowColor: passed || isCurrent ? GOLD_DARK : '#000',
            transform: [{ translateY: pressed ? 3 : 0 }],
            opacity: unlocked ? 1 : 0.55,
          },
        ]}
      >
        {passed ? (
          <Ionicons name="checkmark" size={34} color="#fff" />
        ) : unlocked ? (
          <Ionicons name="trophy" size={30} color={GOLD_DARK} />
        ) : (
          <Ionicons name="lock-closed" size={22} color={c.textSecondary} />
        )}
      </Pressable>
      <Text numberOfLines={1} style={[styles.label, { color: unlocked ? c.text : c.textSecondary, fontWeight: '700' }]}>
        {cp.title}
      </Text>
      <Text style={[styles.cpMeta, { color: c.textSecondary }]}>{cp.questionCount} Q · {cp.passPct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  nodeWrap: { position: 'absolute', alignItems: 'center' },
  bubble: {
    alignItems: 'center', justifyContent: 'center', borderWidth: 3,
    shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.6, shadowRadius: 0, elevation: 5,
  },
  nodeNum: { fontWeight: '800', fontSize: 22 },
  stars: { flexDirection: 'row', marginTop: -6, backgroundColor: 'transparent' },
  label: { marginTop: 4, fontSize: 12, fontWeight: '600', textAlign: 'center', maxWidth: 130, lineHeight: 15 },
  cpMeta: { fontSize: 10.5, marginTop: 1 },
});
