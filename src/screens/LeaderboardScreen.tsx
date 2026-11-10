import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api, Entry, Scope, User } from '../api';
import { EXERCISES, ExerciseId, formatWeight, Unit } from '../exercises';
import { colors } from '../theme';

type Props = { scope: Scope; user: User; unit: Unit };

const MEDALS = [colors.gold, colors.silver, colors.bronze];

export function LeaderboardScreen({ scope, user, unit }: Props) {
  const [exercise, setExercise] = useState<ExerciseId>('bench');
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const result = await api.leaderboard(exercise, scope);
      if (request !== latestRequest.current) return;
      setEntries(result);
      setError(null);
    } catch (e) {
      if (request !== latestRequest.current) return;
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }, [exercise, scope]);

  useEffect(() => {
    setEntries(null);
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{scope === 'friends' ? 'Friends' : 'Global'}</Text>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {EXERCISES.map((item) => {
            const selected = item.id === exercise;
            return (
              <Pressable
                key={item.id}
                onPress={() => setExercise(item.id)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={load} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : entries === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(entry) => entry.userId}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {scope === 'friends'
                ? 'No records here yet. Add your own PR and some friends from the Profile tab.'
                : 'Nobody has posted a record for this lift yet. Be the first!'}
            </Text>
          }
          renderItem={({ item, index }) => {
            const isMe = item.userId === user.id;
            return (
              <View style={[styles.row, isMe && styles.rowMe]}>
                <View style={[styles.rank, index < 3 && { backgroundColor: MEDALS[index] }]}>
                  <Text style={[styles.rankText, index < 3 && styles.rankTextMedal]}>{index + 1}</Text>
                </View>
                <Text style={styles.name} numberOfLines={1}>
                  {item.username}
                  {isMe ? ' (you)' : ''}
                </Text>
                <Text style={styles.weight}>{formatWeight(item.weightKg, unit)}</Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', paddingHorizontal: 16, paddingTop: 12 },
  chips: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.muted, fontWeight: '600' },
  chipTextSelected: { color: '#1A0E03' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowMe: { backgroundColor: colors.cardHighlight, borderColor: colors.accent },
  rank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  rankText: { color: colors.text, fontWeight: '700' },
  rankTextMedal: { color: '#1A1A1A' },
  name: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
  weight: { color: colors.text, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 48, lineHeight: 20 },
  error: { color: colors.danger, textAlign: 'center' },
  retry: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.card },
  retryText: { color: colors.text, fontWeight: '600' },
});
