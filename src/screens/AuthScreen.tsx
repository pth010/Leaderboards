import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { api, USERNAME_PATTERN } from '../api';
import { colors } from '../theme';

export function AuthScreen() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  const submit = async () => {
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();
    if (!trimmedEmail || !password) {
      setStatus({ text: 'Enter your e-mail and password.', ok: false });
      return;
    }
    if (mode === 'signUp') {
      if (!USERNAME_PATTERN.test(trimmedUsername)) {
        setStatus({ text: 'Usernames are 3–20 letters, numbers or underscores.', ok: false });
        return;
      }
      if (password.length < 6) {
        setStatus({ text: 'Password must be at least 6 characters.', ok: false });
        return;
      }
    }

    setBusy(true);
    setStatus(null);
    try {
      if (mode === 'signIn') {
        await api.signIn(trimmedEmail, password);
      } else {
        const needsConfirmation = await api.signUp(trimmedEmail, password, trimmedUsername);
        if (needsConfirmation) {
          setMode('signIn');
          setStatus({ text: 'Account created. Check your e-mail to confirm it, then sign in.', ok: true });
        }
      }
    } catch (e) {
      setStatus({ text: e instanceof Error ? e.message : 'Something went wrong.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🏋️</Text>
        <Text style={styles.title}>Gym Leaderboards</Text>
        <Text style={styles.subtitle}>Post your PRs. Out-lift your friends.</Text>

        {mode === 'signUp' && (
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="E-mail"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
          onSubmitEditing={submit}
        />

        {status && <Text style={[styles.status, !status.ok && styles.statusError]}>{status.text}</Text>}

        <Pressable style={[styles.button, busy && styles.buttonDisabled]} disabled={busy} onPress={submit}>
          {busy ? (
            <ActivityIndicator color="#1A0E03" />
          ) : (
            <Text style={styles.buttonText}>{mode === 'signIn' ? 'Sign in' : 'Create account'}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(mode === 'signIn' ? 'signUp' : 'signIn');
            setStatus(null);
          }}
          hitSlop={8}
        >
          <Text style={styles.switch}>
            {mode === 'signIn' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 },
  logo: { fontSize: 56, textAlign: 'center' },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: colors.muted, textAlign: 'center', marginBottom: 16 },
  input: {
    color: colors.text,
    fontSize: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  status: { color: colors.muted, textAlign: 'center' },
  statusError: { color: colors.danger },
  button: { padding: 15, borderRadius: 12, alignItems: 'center', backgroundColor: colors.accent, marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#1A0E03', fontSize: 16, fontWeight: '800' },
  switch: { color: colors.accent, textAlign: 'center', marginTop: 8, fontWeight: '600' },
});
