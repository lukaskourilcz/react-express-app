import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../src/lib/useColors';
import { useT } from '../../src/lib/i18n';

export default function TabsLayout() {
  const c = useColors();
  const { t } = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.brand,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tab.learn'), tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="streak"
        options={{ title: t('tab.streak'), tabBarIcon: ({ color, size }) => <Ionicons name="flame-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="quiz"
        options={{ title: t('tab.quiz'), tabBarIcon: ({ color, size }) => <Ionicons name="help-circle-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{ title: t('tab.ranks'), tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: t('tab.account'), tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
