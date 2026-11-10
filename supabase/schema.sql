-- Gym Leaderboards schema. Run this once in the Supabase SQL editor.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);
create unique index profiles_username_key on public.profiles (lower(username));

-- One personal record per user per exercise.
create table public.records (
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise text not null check (exercise in ('bench', 'squat', 'deadlift', 'ohp')),
  weight_kg numeric(6, 2) not null check (weight_kg > 0 and weight_kg <= 1000),
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise)
);
create index records_ranking_idx on public.records (exercise, weight_kg desc);

-- A row means user_id has added friend_id to their Friends leaderboard.
create table public.friends (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

alter table public.profiles enable row level security;
alter table public.records enable row level security;
alter table public.friends enable row level security;

-- Usernames are public (needed to check availability at sign-up and to add friends).
create policy "profiles are readable by everyone"
  on public.profiles for select using (true);

create policy "records are readable by signed-in users"
  on public.records for select to authenticated using (true);
create policy "users insert their own records"
  on public.records for insert to authenticated with check (auth.uid() = user_id);
create policy "users update their own records"
  on public.records for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete their own records"
  on public.records for delete to authenticated using (auth.uid() = user_id);

create policy "users read their own friend list"
  on public.friends for select to authenticated using (auth.uid() = user_id);
create policy "users add their own friends"
  on public.friends for insert to authenticated with check (auth.uid() = user_id);
create policy "users remove their own friends"
  on public.friends for delete to authenticated using (auth.uid() = user_id);

-- Create a profile automatically when someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
