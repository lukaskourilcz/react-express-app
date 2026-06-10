import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/useColors';
import { ABBREVIATION_GROUPS, ABBREVIATION_COUNT } from '../lib/abbreviations';

export default function AbbreviationsScreen() {
  const c = useColors();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const sections = useMemo(() => {
    const groups = q
      ? ABBREVIATION_GROUPS.map((g) => ({
          ...g,
          items: g.items.filter(
            (a) =>
              a.term.toLowerCase().includes(q) ||
              a.full.toLowerCase().includes(q) ||
              a.description.toLowerCase().includes(q),
          ),
        })).filter((g) => g.items.length > 0)
      : ABBREVIATION_GROUPS;
    return groups.map((g) => ({ title: g.label, data: g.items }));
  }, [q]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.h1, { color: c.text }]}>Abbreviations</Text>
        <Text style={{ color: c.textSecondary, marginBottom: 12 }}>{ABBREVIATION_COUNT} terms</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search (npx, CORS, JWT…)"
          placeholderTextColor={c.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
        />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.term}
        contentContainerStyle={{ padding: 20, paddingTop: 4 }}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={<Text style={{ color: c.textSecondary }}>No matches.</Text>}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.section, { color: c.textSecondary }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <View style={[styles.item, { borderColor: c.border, backgroundColor: c.card }]}>
            <Text style={[styles.term, { color: c.brand }]}>
              {item.term} <Text style={[styles.full, { color: c.textSecondary }]}>· {item.full}</Text>
            </Text>
            <Text style={{ color: c.text, marginTop: 2 }}>{item.description}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20 },
  h1: { fontSize: 24, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  section: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
  item: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  term: { fontSize: 15, fontWeight: '800', fontFamily: 'monospace' },
  full: { fontSize: 13, fontWeight: '400' },
});
