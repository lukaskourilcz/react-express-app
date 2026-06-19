import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../lib/useColors';
import { useAuth } from '../lib/auth';
import { friendlyError } from '../lib/api';
import { listFlashcards, removeFlashcard, type Flashcard } from '../lib/userApi';
import { useT } from '../lib/i18n';
import { QuestionText } from '../components/QuestionText';
import { Card, PrimaryButton } from '../components/ui';

export default function FlashcardsScreen() {
  const c = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { t } = useT();
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!isAuthenticated) {
      setCards([]);
      return;
    }
    setError(null);
    setCards(null);
    listFlashcards()
      .then((r) => setCards(r.cards))
      .catch((e) => setError(friendlyError(e)));
  };
  useEffect(load, [isAuthenticated]);

  const remove = async (id: string) => {
    setCards((prev) => prev?.filter((card) => card.question_id !== id) ?? prev);
    try {
      await removeFlashcard(id);
    } catch {
      load(); // re-sync on failure
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Text style={[styles.title, { color: c.text }]}>{t('cards.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      {!isAuthenticated ? (
        <Centered>
          <Text style={{ color: c.textSecondary, textAlign: 'center' }}>{t('cards.signIn')}</Text>
        </Centered>
      ) : error ? (
        <Centered>
          <Text style={{ color: c.error, marginBottom: 16, textAlign: 'center' }}>{error}</Text>
          <PrimaryButton label={t('common.retry')} onPress={load} />
        </Centered>
      ) : !cards ? (
        <Centered>
          <ActivityIndicator color={c.brand} size="large" />
        </Centered>
      ) : cards.length === 0 ? (
        <Centered>
          <Ionicons name="bookmark-outline" size={48} color={c.textSecondary} />
          <Text style={{ color: c.textSecondary, marginTop: 12, textAlign: 'center', paddingHorizontal: 32 }}>
            {t('cards.empty')}
          </Text>
        </Centered>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {cards.map((card) => (
            <Card key={card.question_id} style={{ marginBottom: 12 }}>
              <QuestionText text={card.question} size={15} />
              <View style={[styles.answer, { borderTopColor: c.border }]}>
                <Ionicons name="checkmark-circle" size={16} color={c.success} />
                <Text style={{ color: c.success, fontWeight: '700', flex: 1 }}>{card.correct_answer}</Text>
              </View>
              {card.explanation ? (
                <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 6 }}>{card.explanation}</Text>
              ) : null}
              <Pressable onPress={() => remove(card.question_id)} style={styles.removeBtn}>
                <Ionicons name="trash-outline" size={16} color={c.error} />
                <Text style={{ color: c.error, fontWeight: '600' }}>{t('cards.remove')}</Text>
              </Pressable>
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );

  function Centered({ children }: { children: React.ReactNode }) {
    return <View style={styles.centered}>{children}</View>;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  title: { fontSize: 20, fontWeight: '800' },
  list: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  answer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start' },
});
