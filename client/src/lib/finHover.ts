import type { CSSProperties } from 'react';

export interface FinHoverAnimation {
  motion: 'swim' | 'rise' | 'dive' | 'fade' | 'diagonal';
  direction: 1 | -1;
  size: number;
  shade: number;
  duration: number;
  position: number;
}

/** Generate once per mounted button. Inject a random source for reproducible previews. */
export function generateFinHover(random: () => number = Math.random, direction?: 1 | -1): FinHoverAnimation {
  const motions = ['swim', 'rise', 'dive', 'fade', 'diagonal'] as const;
  return {
    motion: motions[Math.floor(random() * motions.length)],
    direction: direction ?? (random() < 0.5 ? 1 : -1),
    size: 26 + Math.floor(random() * 33),
    shade: Math.round((0.12 + random() * 0.22) * 100) / 100,
    duration: 450 + Math.floor(random() * 1351),
    position: 10 + Math.floor(random() * 65),
  };
}

export function finHoverStyle(animation: FinHoverAnimation): CSSProperties {
  const {motion,direction,size,duration,position}=animation;
  const swim = motion === 'swim';
  return {
    '--fin-size': `${size}px`,
    '--fin-duration': `${motion === 'fade' ? Math.round(duration * 0.45) : duration}ms`,
    '--fin-position': `${swim ? 0 : position}%`,
    // The V9 fin faces right (tip left, swept back), so a fin travelling
    // right draws unmirrored and one travelling left is flipped.
    '--fin-flip': direction,
    '--fin-from-x': swim ? (direction === 1 ? '-40%' : '115%') : motion === 'diagonal' ? `${direction * -30}%` : '0%',
    '--fin-to-x': swim ? (direction === 1 ? '45%' : '10%') : motion === 'dive' ? `${direction * 25}%` : '0%',
    '--fin-from-y': motion === 'rise' || motion === 'diagonal' ? '100%' : '0%',
    '--fin-to-y': motion === 'dive' ? '100%' : '0%',
    '--fin-from-scale': 1,
  } as CSSProperties;
}
