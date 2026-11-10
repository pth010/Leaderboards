import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ExerciseId } from './exercises';

export type Scope = 'friends' | 'global';

export type User = { id: string; username: string };

export type Entry = {
  userId: string;
  username: string;
  weightKg: number;
};

export type MyRecords = Partial<Record<ExerciseId, number>>;

export interface Api {
  /** True when no backend is configured and the app is showing sample data. */
  readonly demo: boolean;
  /** Calls back with the signed-in user (or null) now and on every change. Returns an unsubscribe function. */
  onUserChange(callback: (user: User | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  /** Resolves to true if the account needs e-mail confirmation before signing in. */
  signUp(email: string, password: string, username: string): Promise<boolean>;
  signOut(): Promise<void>;
  leaderboard(exercise: ExerciseId, scope: Scope): Promise<Entry[]>;
  myRecords(): Promise<MyRecords>;
  saveRecord(exercise: ExerciseId, weightKg: number): Promise<void>;
  friends(): Promise<User[]>;
  addFriend(username: string): Promise<void>;
  removeFriend(friendId: string): Promise<void>;
}

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

// ---------------------------------------------------------------------------
// Supabase implementation
// ---------------------------------------------------------------------------

function createSupabaseApi(url: string, key: string): Api {
  const supabase: SupabaseClient = createClient(url, key, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  let currentUserId: string | null = null;

  function requireUserId(): string {
    if (!currentUserId) throw new Error('You are signed out.');
    return currentUserId;
  }

  async function loadUser(id: string, fallbackName: string): Promise<User> {
    const { data } = await supabase.from('profiles').select('username').eq('id', id).maybeSingle();
    return { id, username: data?.username ?? fallbackName };
  }

  return {
    demo: false,

    onUserChange(callback) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        currentUserId = session?.user.id ?? null;
        if (!session) {
          callback(null);
          return;
        }
        const fallback = session.user.user_metadata?.username ?? 'you';
        // Supabase must not be called from inside this callback, so defer the profile lookup.
        setTimeout(() => {
          loadUser(session.user.id, fallback).then((user) => {
            if (currentUserId === user.id) callback(user);
          });
        }, 0);
      });
      return () => data.subscription.unsubscribe();
    },

    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },

    async signUp(email, password, username) {
      const taken = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle();
      if (taken.error) throw new Error(taken.error.message);
      if (taken.data) throw new Error('That username is already taken.');

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) throw new Error(error.message);
      return !data.session;
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    },

    async leaderboard(exercise, scope) {
      let query = supabase
        .from('records')
        .select('user_id, weight_kg, profiles(username)')
        .eq('exercise', exercise)
        .order('weight_kg', { ascending: false })
        .order('updated_at', { ascending: true })
        .limit(100);

      if (scope === 'friends') {
        const me = requireUserId();
        const friendRows = await supabase.from('friends').select('friend_id').eq('user_id', me);
        if (friendRows.error) throw new Error(friendRows.error.message);
        query = query.in('user_id', [me, ...friendRows.data.map((row) => row.friend_id)]);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data as any[]).map((row) => ({
        userId: row.user_id,
        username: row.profiles?.username ?? 'unknown',
        weightKg: Number(row.weight_kg),
      }));
    },

    async myRecords() {
      const { data, error } = await supabase
        .from('records')
        .select('exercise, weight_kg')
        .eq('user_id', requireUserId());
      if (error) throw new Error(error.message);
      const records: MyRecords = {};
      for (const row of data) records[row.exercise as ExerciseId] = Number(row.weight_kg);
      return records;
    },

    async saveRecord(exercise, weightKg) {
      const { error } = await supabase.from('records').upsert(
        {
          user_id: requireUserId(),
          exercise,
          weight_kg: Math.round(weightKg * 100) / 100,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,exercise' },
      );
      if (error) throw new Error(error.message);
    },

    async friends() {
      const rows = await supabase.from('friends').select('friend_id').eq('user_id', requireUserId());
      if (rows.error) throw new Error(rows.error.message);
      const ids = rows.data.map((row) => row.friend_id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', ids)
        .order('username');
      if (error) throw new Error(error.message);
      return data;
    },

    async addFriend(username) {
      const me = requireUserId();
      // Usernames only contain letters, digits and "_"; escape "_" so it is not a wildcard.
      const pattern = username.replace(/_/g, '\\_');
      const found = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', pattern)
        .maybeSingle();
      if (found.error) throw new Error(found.error.message);
      if (!found.data) throw new Error(`No user named "${username}".`);
      if (found.data.id === me) throw new Error("That's you!");
      const { error } = await supabase
        .from('friends')
        .upsert({ user_id: me, friend_id: found.data.id }, { onConflict: 'user_id,friend_id' });
      if (error) throw new Error(error.message);
    },

    async removeFriend(friendId) {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', requireUserId())
        .eq('friend_id', friendId);
      if (error) throw new Error(error.message);
    },
  };
}

// ---------------------------------------------------------------------------
// Demo implementation: sample data kept in memory, used when Supabase is not configured.
// ---------------------------------------------------------------------------

function createDemoApi(): Api {
  const me: User = { id: 'me', username: 'you' };
  const users: Record<string, { username: string; records: MyRecords }> = {
    me: { username: 'you', records: { bench: 80, squat: 110 } },
    u1: { username: 'iron_mike', records: { bench: 140, squat: 200, deadlift: 240, ohp: 85 } },
    u2: { username: 'liftqueen', records: { bench: 75, squat: 135, deadlift: 160, ohp: 50 } },
    u3: { username: 'sam_squats', records: { bench: 100, squat: 180, deadlift: 190 } },
    u4: { username: 'deadlift_dan', records: { bench: 110, deadlift: 260, ohp: 70 } },
    u5: { username: 'newbie_gains', records: { bench: 50, squat: 70, deadlift: 90, ohp: 35 } },
  };
  const friendIds = new Set(['u2', 'u3']);

  return {
    demo: true,
    onUserChange(callback) {
      callback(me);
      return () => {};
    },
    async signIn() {},
    async signUp() {
      return false;
    },
    async signOut() {},
    async leaderboard(exercise, scope) {
      return Object.entries(users)
        .filter(([id]) => scope === 'global' || id === me.id || friendIds.has(id))
        .filter(([, user]) => user.records[exercise] != null)
        .map(([id, user]) => ({
          userId: id,
          username: user.username,
          weightKg: user.records[exercise]!,
        }))
        .sort((a, b) => b.weightKg - a.weightKg);
    },
    async myRecords() {
      return { ...users.me.records };
    },
    async saveRecord(exercise, weightKg) {
      users.me.records[exercise] = weightKg;
    },
    async friends() {
      return [...friendIds].map((id) => ({ id, username: users[id].username }));
    },
    async addFriend(username) {
      const match = Object.entries(users).find(
        ([, user]) => user.username.toLowerCase() === username.toLowerCase(),
      );
      if (!match) throw new Error(`No user named "${username}".`);
      if (match[0] === me.id) throw new Error("That's you!");
      friendIds.add(match[0]);
    },
    async removeFriend(friendId) {
      friendIds.delete(friendId);
    },
  };
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const api: Api = url && key ? createSupabaseApi(url, key) : createDemoApi();
