import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, User } from '../api';
import { EXERCISES, ExerciseId, formatNumber, fromKg, toKg, Unit } from '../exercises';
import { colors } from '../theme';

type Props = { user: User; unit: Unit; onUnitChange: (unit: Unit) => void };

type Inputs = Record<ExerciseId, string>;

const EMPTY_INPUTS: Inputs = { bench: '', squat: '', deadlift: '', ohp: '' };

function message(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

export function ProfileScreen({ user, unit, onUnitChange }: Props) {
  const [inputs, setInputs] = useState<Inputs>(EMPTY_INPUTS);
  const [recordStatus, setRecordStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState<ExerciseId | null>(null);

  const [friends, setFriends] = useState<User[]>([]);
  const [friendName, setFriendName] = useState('');
  const [friendStatus, setFriendStatus] = useState<{ text: string; ok: boolean } | null>(null);

  // Load saved records, shown in the currently selected unit.
  useEffect(() => {
    let cancelled = false;
    api
      .myRecords()
      .then((records) => {
        if (cancelled) return;
        const next = { ...EMPTY_INPUTS };
        for (const { id } of EXERCISES) {
          const kg = records[id];
          if (kg != null) next[id] = formatNumber(fromKg(kg, unit));
        }
        setInputs(next);
      })
      .catch((e) => !cancelled && setRecordStatus({ text: message(e), ok: false }));
    return () => {
      cancelled = true;
    };
  }, [unit]);

  const loadFriends = () =>
    api
      .friends()
      .then(setFriends)
      .catch((e) => setFriendStatus({ text: message(e), ok: false }));

  useEffect(() => {
    loadFriends();
  }, []);

  const save = async (exercise: ExerciseId, name: string) => {
    const value = Number(inputs[exercise].replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0 || toKg(value, unit) > 1000) {
      setRecordStatus({ text: `Enter a valid weight for ${name}.`, ok: false });
      return;
    }
    setSaving(exercise);
    try {
      await api.saveRecord(exercise, toKg(value, unit));
      setRecordStatus({ text: `${name} PR saved.`, ok: true });
    } catch (e) {
      setRecordStatus({ text: message(e), ok: false });
    } finally {
      setSaving(null);
    }
  };

  const addFriend = async () => {
    const name = friendName.trim();
    if (!name) return;
    try {
      await api.addFriend(name);
      setFriendName('');
      setFriendStatus({ text: `Added ${name}.`, ok: true });
      await loadFriends();
    } catch (e) {
      setFriendStatus({ text: message(e), ok: false });
    }
  };

  const removeFriend = async (friend: User) => {
    try {
      await api.removeFriend(friend.id);
      setFriendStatus(null);
      await loadFriends();
    } catch (e) {
      setFriendStatus({ text: message(e), ok: false });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{user.username}</Text>

        <View style={styles.sectionHeader}>
          <Text style={styles.section}>My personal records</Text>
          <View style={styles.unitToggle}>
            {(['kg', 'lb'] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => onUnitChange(option)}
                style={[styles.unitOption, unit === option && styles.unitOptionSelected]}
              >
                <Text style={[styles.unitText, unit === option && styles.unitTextSelected]}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {EXERCISES.map(({ id, name }) => (
          <View key={id} style={styles.card}>
            <Text style={styles.cardLabel}>{name}</Text>
            <TextInput
              style={styles.weightInput}
              value={inputs[id]}
              onChangeText={(text) => setInputs((prev) => ({ ...prev, [id]: text }))}
              placeholder="—"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              accessibilityLabel={`${name} weight in ${unit}`}
            />
            <Text style={styles.unitSuffix}>{unit}</Text>
            <Pressable
              style={[styles.button, saving === id && styles.buttonDisabled]}
              disabled={saving === id}
              onPress={() => save(id, name)}
            >
              <Text style={styles.buttonText}>Save</Text>
            </Pressable>
          </View>
        ))}
        {recordStatus && (
          <Text style={[styles.status, !recordStatus.ok && styles.statusError]}>{recordStatus.text}</Text>
        )}

        <Text style={[styles.section, styles.sectionSpaced]}>Friends</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.friendInput}
            value={friendName}
            onChangeText={setFriendName}
            placeholder="Friend's username"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={addFriend}
            returnKeyType="done"
          />
          <Pressable style={styles.button} onPress={addFriend}>
            <Text style={styles.buttonText}>Add</Text>
          </Pressable>
        </View>
        {friendStatus && (
          <Text style={[styles.status, !friendStatus.ok && styles.statusError]}>{friendStatus.text}</Text>
        )}
        {friends.length === 0 ? (
          <Text style={styles.hint}>
            Add friends by username to see them on your Friends leaderboard.
          </Text>
        ) : (
          friends.map((friend) => (
            <View key={friend.id} style={styles.card}>
              <Text style={styles.cardLabel}>{friend.username}</Text>
              <Pressable onPress={() => removeFriend(friend)} hitSlop={8}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          ))
        )}

        {!api.demo && (
          <Pressable style={styles.signOut} onPress={() => api.signOut().catch(() => {})}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 8 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { color: colors.muted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionSpaced: { marginTop: 20 },
  unitToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  unitOption: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: colors.card },
  unitOptionSelected: { backgroundColor: colors.accent },
  unitText: { color: colors.muted, fontWeight: '700' },
  unitTextSelected: { color: '#1A0E03' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
  weightInput: {
    width: 76,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitSuffix: { color: colors.muted, width: 20 },
  friendInput: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: colors.accent },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#1A0E03', fontWeight: '800' },
  status: { color: colors.muted, marginLeft: 4 },
  statusError: { color: colors.danger },
  hint: { color: colors.muted, marginTop: 4, marginLeft: 4, lineHeight: 20 },
  remove: { color: colors.danger, fontWeight: '600' },
  signOut: {
    marginTop: 28,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  signOutText: { color: colors.danger, fontWeight: '700' },
});
