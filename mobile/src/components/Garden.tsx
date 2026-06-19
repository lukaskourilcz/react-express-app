// A GitHub-style contribution "garden": one tile per day, greener the more
// lessons were completed. This is the in-app mirror of the home-screen widget.
import { StyleSheet, View } from 'react-native';
import { useColors } from '../lib/useColors';
import type { GardenDay } from '../lib/streak';

const LEVELS = ['#9be37d', '#58cc02', '#3a8a00']; // 1, 2, 3+ lessons

function tileColor(count: number, empty: string): string {
  if (count <= 0) return empty;
  if (count === 1) return LEVELS[0];
  if (count === 2) return LEVELS[1];
  return LEVELS[2];
}

export function Garden({ garden, tile = 13, gap = 3 }: { garden: GardenDay[]; tile?: number; gap?: number }) {
  const c = useColors();
  // Pad the front so the first column starts on the correct weekday (Sun=0).
  const firstWeekday = garden.length ? new Date(`${garden[0].date}T00:00:00`).getDay() : 0;
  const cells: (GardenDay | null)[] = [...Array(firstWeekday).fill(null), ...garden];
  const weeks: (GardenDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View style={[styles.row, { gap }]}>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ gap }}>
          {Array.from({ length: 7 }).map((_, di) => {
            const day = week[di];
            return (
              <View
                key={di}
                style={{
                  width: tile,
                  height: tile,
                  borderRadius: 3,
                  backgroundColor: day ? tileColor(day.count, c.brandSoft) : 'transparent',
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
});
