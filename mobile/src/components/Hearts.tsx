// A single heart that drains a third per mistake (3 mistakes = empty), matching
// the web lesson. The red fill is clipped to the remaining fraction so it empties
// from the top down.
import Svg, { Path, Defs, ClipPath, Rect } from 'react-native-svg';
import { View } from 'react-native';

const HEART =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
const RED = '#ff4b6e';
const FADED = 'rgba(255,75,110,0.22)';

export function Hearts({ mistakes, max = 3, size = 34 }: { mistakes: number; max?: number; size?: number }) {
  const remaining = Math.max(0, max - mistakes);
  const frac = remaining / max;
  return (
    <View accessibilityLabel={`${remaining} of ${max} hearts left`}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Defs>
          <ClipPath id="heartClip">
            <Rect x={0} y={(1 - frac) * 24} width={24} height={frac * 24} />
          </ClipPath>
        </Defs>
        <Path d={HEART} fill={FADED} />
        <Path d={HEART} fill={RED} clipPath="url(#heartClip)" />
      </Svg>
    </View>
  );
}
