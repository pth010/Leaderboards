import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { api, User } from './src/api';
import { Unit } from './src/exercises';
import { AuthScreen } from './src/screens/AuthScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { colors } from './src/theme';

const TABS = [
  { id: 'friends', label: 'Friends', icon: '👥' },
  { id: 'global', label: 'Global', icon: '🌍' },
  { id: 'profile', label: 'Profile', icon: '👤' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const UNIT_KEY = 'unit';

export default function App() {
  // undefined = still restoring the session, null = signed out
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [tab, setTab] = useState<TabId>('friends');
  const [unit, setUnit] = useState<Unit>('kg');

  useEffect(() => api.onUserChange(setUser), []);

  useEffect(() => {
    AsyncStorage.getItem(UNIT_KEY)
      .then((saved) => {
        if (saved === 'kg' || saved === 'lb') setUnit(saved);
      })
      .catch(() => {});
  }, []);

  const changeUnit = (next: Unit) => {
    setUnit(next);
    AsyncStorage.setItem(UNIT_KEY, next).catch(() => {});
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.app}>
        {user === undefined ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : user === null ? (
          <AuthScreen />
        ) : (
          <>
            {api.demo && (
              <Text style={styles.demoBanner}>
                Demo mode — sample data, nothing is saved. See README to go online.
              </Text>
            )}
            <View style={styles.screen}>
              {tab === 'profile' ? (
                <ProfileScreen user={user} unit={unit} onUnitChange={changeUnit} />
              ) : (
                <LeaderboardScreen key={tab} scope={tab} user={user} unit={unit} />
              )}
            </View>
            <View style={styles.tabBar}>
              {TABS.map((item) => {
                const selected = item.id === tab;
                return (
                  <Pressable
                    key={item.id}
                    style={styles.tab}
                    onPress={() => setTab(item.id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.tabIcon, !selected && styles.tabIconInactive]}>{item.icon}</Text>
                    <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1 },
  demoBanner: {
    color: '#1A0E03',
    backgroundColor: colors.gold,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2 },
  tabIcon: { fontSize: 20 },
  tabIconInactive: { opacity: 0.45 },
  tabLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  tabLabelSelected: { color: colors.accent },
});
