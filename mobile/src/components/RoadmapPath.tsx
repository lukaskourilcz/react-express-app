// The serpentine "snake" learning path for ONE part of a topic, restructured for
// phone widths. A part is a contiguous slice of the topic's global levels ending
// in a part-test node — matching the web client's parts model. Connectors are
// drawn with react-native-svg through the node centres; nodes are tappable
// raised "bubbles".
import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/useColors';
import type { RoadmapLevelMeta, RoadmapTopic } from '../lib/roadmapApi';
import {
  type RoadmapProgress,
  type PartRange,
  isPartLevelUnlocked,
  isLevelPassed,
  levelBestPct,
  isPartTestUnlocked,
  isPartTestPassed,
} from '../lib/roadmapProgress';

// A gentle infinite bob for the current ("play me") node.
function useBob(active: boolean) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (active) {
      v.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      v.value = 0;
    }
  }, [active]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: v.value }] }));
}

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
  | { type: 'test'; part: number; title: string; questionCount: number; passPct: number };

export function RoadmapPath({
  topic,
  range,
  levels,
  partTitle,
  partQuestionCount,
  partPassPct,
  progress,
  onOpenLevel,
  onOpenPartTest,
}: {
  topic: RoadmapTopic;
  range: PartRange;
  /** All the topic's level metas; filtered to the part's global range here. */
  levels: RoadmapLevelMeta[];
  partTitle: string;
  partQuestionCount: number;
  partPassPct: number;
  progress: RoadmapProgress;
  onOpenLevel: (globalLevel: number) => void;
  onOpenPartTest: (part: number) => void;
}) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const partLevels = levels.filter((l) => l.level >= range.startLevel && l.level <= range.endLevel);
  const nodes: Node[] = [
    ...partLevels.map<Node>((meta) => ({ type: 'level', meta })),
    { type: 'test', part: range.part, title: partTitle, questionCount: partQuestionCount, passPct: partPassPct },
  ];

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

  const nodePassed = (node: Node): boolean =>
    node.type === 'level' ? isLevelPassed(progress, topic, node.meta.level) : isPartTestPassed(progress, topic, node.part);

  return (
    <View onLayout={onLayout} style={{ width: '100%', height: width > 0 ? height : 240 }}>
      {width > 0 && (
        <>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            {placed.slice(0, -1).map((a, i) => {
              const b = placed[i + 1];
              const done = nodePassed(a.node) && nodePassed(b.node);
              const stroke = done
                ? b.node.type === 'test'
                  ? c.gold
                  : bandFor(b.node.meta.difficulty)[0]
                : c.border;
              return <Line key={i} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} stroke={stroke} strokeWidth={6} strokeLinecap="round" />;
            })}
          </Svg>
          {placed.map(({ node, cx, cy }) =>
            node.type === 'test' ? (
              <PartTestBubble
                key={`test-${node.part}`}
                title={node.title}
                questionCount={node.questionCount}
                passPct={node.passPct}
                cx={cx}
                cy={cy}
                cellW={cellW}
                unlocked={isPartTestUnlocked(progress, topic, range)}
                passed={isPartTestPassed(progress, topic, node.part)}
                onPress={() => onOpenPartTest(node.part)}
              />
            ) : (
              <LevelBubble
                key={`lvl-${node.meta.level}`}
                meta={node.meta}
                cx={cx}
                cy={cy}
                cellW={cellW}
                unlocked={isPartLevelUnlocked(progress, topic, range, node.meta.level)}
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
  const bobStyle = useBob(isCurrent);
  return (
    <View style={[styles.nodeWrap, { left: cx - cellW / 2, top: cy - NODE / 2, width: cellW }]}>
      <Animated.View style={bobStyle}>
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
      </Animated.View>
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

function PartTestBubble({
  title, questionCount, passPct, cx, cy, cellW, unlocked, passed, onPress,
}: {
  title: string; questionCount: number; passPct: number; cx: number; cy: number; cellW: number;
  unlocked: boolean; passed: boolean; onPress: () => void;
}) {
  const c = useColors();
  const isCurrent = unlocked && !passed;
  const bobStyle = useBob(isCurrent);
  return (
    <View style={[styles.nodeWrap, { left: cx - cellW / 2, top: cy - CP / 2, width: cellW }]}>
      <Animated.View style={bobStyle}>
      <Pressable
        onPress={unlocked ? onPress : undefined}
        disabled={!unlocked}
        accessibilityRole="button"
        accessibilityLabel={`Part test: ${title}${unlocked ? '' : ' (locked)'}`}
        style={({ pressed }) => [
          styles.bubble,
          {
            width: CP, height: CP, borderRadius: 20,
            backgroundColor: passed ? c.gold : c.card,
            borderColor: passed || isCurrent ? c.goldDark : c.border,
            shadowColor: passed || isCurrent ? c.goldDark : '#000',
            transform: [{ translateY: pressed ? 3 : 0 }],
            opacity: unlocked ? 1 : 0.55,
          },
        ]}
      >
        {passed ? (
          <Ionicons name="checkmark" size={34} color="#fff" />
        ) : unlocked ? (
          <Ionicons name="trophy" size={30} color={c.goldDark} />
        ) : (
          <Ionicons name="lock-closed" size={22} color={c.textSecondary} />
        )}
      </Pressable>
      </Animated.View>
      <Text numberOfLines={1} style={[styles.label, { color: unlocked ? c.text : c.textSecondary, fontWeight: '700' }]}>
        {title}
      </Text>
      <Text style={[styles.cpMeta, { color: c.textSecondary }]}>{questionCount} Q · {passPct}%</Text>
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
