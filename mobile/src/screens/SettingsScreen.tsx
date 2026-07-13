import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/useColors';
import { Card } from '../components/ui';
import { useColorMode, setColorMode, type ColorMode } from '../lib/colorMode';
import { useSettings } from '../lib/settings';
import { useT, setLang, type Lang } from '../lib/i18n';
import { useTrack, setTrack, type Track } from '../lib/tracks';

type Colors = ReturnType<typeof useColors>;

export default function SettingsScreen() {
  const c = useColors();
  const router = useRouter();
  const { t, lang } = useT();
  const mode = useColorMode();
  const [settings, updateSettings] = useSettings();
  const track = useTrack();

  const modeOptions: { value: ColorMode; label: string }[] = [
    { value: 'system', label: t('settings.system') },
    { value: 'light', label: t('settings.light') },
    { value: 'dark', label: t('settings.dark') },
  ];

  const langOptions: { value: Lang; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'cs', label: 'Čeština' },
  ];

  const trackOptions: { value: Track; label: string }[] = [
    { value: null, label: t('settings.track.none') },
    { value: 'frontend', label: t('settings.track.frontend') },
    { value: 'backend', label: t('settings.track.backend') },
    { value: 'fullstack', label: t('settings.track.fullstack') },
  ];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="close" size={26} color={c.text} />
        </Pressable>
        <Text style={[styles.title, { color: c.text }]}>{t('settings.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Appearance */}
        <Text style={[styles.section, { color: c.textSecondary }]}>{t('settings.appearance')}</Text>
        <Card style={styles.group}>
          <View style={styles.chipRow}>
            {modeOptions.map((o) => (
              <Chip
                key={o.value}
                c={c}
                label={o.label}
                selected={mode === o.value}
                onPress={() => void setColorMode(o.value)}
              />
            ))}
          </View>
        </Card>

        {/* Sound & haptics */}
        <Text style={[styles.section, { color: c.textSecondary }]}>{t('settings.sound')}</Text>
        <Card style={styles.group}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: c.text }]}>{t('settings.sound')}</Text>
              <Text style={[styles.rowDesc, { color: c.textSecondary }]}>{t('settings.soundDesc')}</Text>
            </View>
            <Switch
              value={settings.soundEffects}
              onValueChange={(v) => updateSettings({ soundEffects: v })}
              trackColor={{ true: c.brand, false: c.border }}
            />
          </View>
        </Card>

        {/* Language */}
        <Text style={[styles.section, { color: c.textSecondary }]}>{t('settings.language')}</Text>
        <Card style={styles.group}>
          <View style={styles.chipRow}>
            {langOptions.map((o) => (
              <Chip
                key={o.value}
                c={c}
                label={o.label}
                selected={lang === o.value}
                onPress={() => void setLang(o.value)}
              />
            ))}
          </View>
        </Card>

        {/* Learning track */}
        <Text style={[styles.section, { color: c.textSecondary }]}>{t('settings.track')}</Text>
        <Card style={styles.group}>
          <View style={styles.chipRow}>
            {trackOptions.map((o) => (
              <Chip
                key={o.value ?? 'none'}
                c={c}
                label={o.label}
                selected={track === o.value}
                onPress={() => setTrack(o.value)}
              />
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  c,
  label,
  selected,
  onPress,
}: {
  c: Colors;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? c.brand : c.border,
          backgroundColor: selected ? c.brand : c.card,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={{ color: selected ? '#fff' : c.textSecondary, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  closeBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: '800' },
  body: { padding: 20, paddingTop: 8, gap: 4 },
  section: {
    marginTop: 20,
    marginBottom: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  group: { gap: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontWeight: '600', fontSize: 16 },
  rowDesc: { fontSize: 13 },
});
