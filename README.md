# Gym Leaderboards

A phone app (Android and iOS, one codebase) where friends post their gym personal records and get ranked.

- **Friends tab** – you and the people you've added, ranked per lift
- **Global tab** – everyone using the app, top 100 per lift
- **Profile tab** – enter your PRs (kg or lb), add or remove friends by username

Lifts: Bench Press, Squat, Deadlift, Overhead Press. Built with [Expo](https://expo.dev) (React Native) and [Supabase](https://supabase.com) for accounts and shared data.

## Run it on your phone

You need [Node.js](https://nodejs.org) on your computer and the **Expo Go** app on your phone (App Store / Google Play).

```bash
npm install
```

```bash
npx expo start
```

Scan the QR code with your phone's camera (iOS) or from inside Expo Go (Android). If Expo Go says the project needs a newer SDK, update Expo Go.

Without a backend configured the app starts in **demo mode**: sample data, no sign-in, nothing saved.

## Go online (shared leaderboards)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project's **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and run it.
3. Copy `.env.example` to `.env` and fill in the project URL and anon/publishable key from **Project Settings → API**.
4. Restart with `npx expo start --clear`.

The app now shows a sign-in screen, and everyone who uses your build shares the same leaderboards.

By default Supabase e-mails a confirmation link to new accounts. For quick testing you can turn that off under **Authentication → Sign In / Providers → Email → Confirm email**.

## How it works

| Path | What it is |
| --- | --- |
| `App.tsx` | App shell: session handling and the bottom tab bar |
| `src/screens/` | Sign-in, leaderboard (used for both Friends and Global) and profile screens |
| `src/api.ts` | All data access: the Supabase implementation and the in-memory demo one |
| `src/exercises.ts` | List of lifts and kg/lb conversion |
| `supabase/schema.sql` | Database tables, security rules and the sign-up trigger |

Weights are stored in kilograms; the kg/lb switch only changes how they are displayed and entered. Adding a friend is one-way (like following): they appear on your Friends board immediately, and you appear on theirs once they add you.

## Publishing to the stores

When you're ready, [EAS Build](https://docs.expo.dev/build/introduction/) produces the store-ready Android and iOS apps. Publishing requires a Google Play developer account and an Apple Developer account.
