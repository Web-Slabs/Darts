-- Bullseye Darts Scoreboard — Supabase schema (idempotent — safe to re-run)
-- Upgrades older installs (games/profiles-with-nickname) and creates everything
-- the app needs: profiles, venues, matches, leagues, tournaments, analytics.

-- ============ Profiles (1 per auth user) ============
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  nickname text,                          -- legacy column (pre-2026 installs)
  province text,                          -- legacy column
  last_seen timestamptz,                  -- presence heartbeat ("current players")
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists last_seen timestamptz;

-- Backfill display_name from nickname for existing rows
update public.profiles set display_name = coalesce(display_name, nickname) where display_name is null;
-- Default any nulls to something readable
update public.profiles set display_name = 'Player' where display_name is null;

-- ============ Legacy games table (older X01-only records) — kept, untouched ============
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete cascade,
  type text,
  start_score integer,
  final_score integer,
  won boolean,
  players jsonb,
  venue text
);

-- ============ Matches (all games, cross-venue, tagged) ============
create table if not exists public.matches (
  id text primary key,                    -- client-generated uid
  user_id uuid references public.profiles (id) on delete cascade,
  venue_id uuid,
  game text not null,
  played_at timestamptz not null default now(),
  summary text not null,
  players jsonb not null,                 -- [{ id, name, won, lines }]
  created_at timestamptz not null default now()
);

-- ============ Venues (pubs) ============
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  owner_id uuid references auth.users (id),
  region text,
  contact_email text,
  created_at timestamptz not null default now()
);

-- ============ Venue memberships ============
create table if not exists public.venue_players (
  venue_id uuid references public.venues (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  nickname text,
  primary key (venue_id, user_id)
);

-- ============ Leagues ============
create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue_id uuid references public.venues (id),
  format text not null default 'singles',
  game_type text not null default '501',
  points_win int not null default 3,
  points_draw int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.league_players (
  league_id uuid references public.leagues (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  team_name text,
  primary key (league_id, user_id)
);

create table if not exists public.league_fixtures (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references public.leagues (id) on delete cascade,
  round int not null,
  home_user uuid references public.profiles (id),
  away_user uuid references public.profiles (id),
  home_score int,
  away_score int,
  played_at timestamptz,
  notes text
);

-- ============ Tournaments (knockout brackets) ============
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue_id uuid references public.venues (id),
  size int not null check (size in (4, 8, 16, 32)),
  game_type text not null default '501',
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments (id) on delete cascade,
  round int not null,
  slot int not null,
  player_a uuid references public.profiles (id),
  player_b uuid references public.profiles (id),
  winner uuid references public.profiles (id),
  score_a int,
  score_b int
);

create table if not exists public.tournament_entries (
  tournament_id uuid references public.tournaments (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  seed int,
  primary key (tournament_id, user_id)
);

-- ============ Usage analytics (anonymous events) ============
create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references public.profiles (id) on delete set null,
  venue_id uuid references public.venues (id) on delete set null,
  name text not null,
  game text,
  props jsonb not null default '{}'::jsonb,
  country text,
  user_agent text
);

-- matches.venue_id needs a real FK once venues exists
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'matches_venue_id_fkey'
  ) then
    alter table public.matches
      add constraint matches_venue_id_fkey
      foreign key (venue_id) references public.venues (id) on delete set null;
  end if;
end $$;

-- ============ Row level security ============
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.matches enable row level security;
alter table public.venues enable row level security;
alter table public.venue_players enable row level security;
alter table public.leagues enable row level security;
alter table public.league_players enable row level security;
alter table public.league_fixtures enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_matches enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.app_events enable row level security;

-- profiles
drop policy if exists "public read profiles" on public.profiles;
create policy "public read profiles" on public.profiles for select using (true);
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
drop policy if exists "own profile upsert" on public.profiles;
create policy "own profile upsert" on public.profiles for insert with check (auth.uid() = id);

-- legacy games: users see only their own
drop policy if exists "own games read" on public.games;
create policy "own games read" on public.games for select using (auth.uid() = user_id);
drop policy if exists "own games insert" on public.games;
create policy "own games insert" on public.games for insert with check (auth.uid() = user_id);

-- matches: readable by any signed-in player, writable only by owner
drop policy if exists "read all matches" on public.matches;
create policy "read all matches" on public.matches for select using (true);
drop policy if exists "insert own matches" on public.matches;
create policy "insert own matches" on public.matches for insert with check (auth.uid() = user_id);
drop policy if exists "update own matches" on public.matches;
create policy "update own matches" on public.matches for update using (auth.uid() = user_id);
drop policy if exists "delete own matches" on public.matches;
create policy "delete own matches" on public.matches for delete using (auth.uid() = user_id);

-- venues
drop policy if exists "public read venues" on public.venues;
create policy "public read venues" on public.venues for select using (true);
drop policy if exists "anyone can register a venue" on public.venues;
create policy "anyone can register a venue" on public.venues for insert with check (auth.uid() is not null);
drop policy if exists "venues owner update" on public.venues;
create policy "venues owner update" on public.venues for update using (auth.uid() = owner_id);

-- venue_players
drop policy if exists "members read venue players" on public.venue_players;
create policy "members read venue players" on public.venue_players for select using (true);
drop policy if exists "join venues" on public.venue_players;
create policy "join venues" on public.venue_players for insert with check (auth.uid() = user_id);
drop policy if exists "leave venues" on public.venue_players;
create policy "leave venues" on public.venue_players for delete using (auth.uid() = user_id);

-- leagues
drop policy if exists "read leagues" on public.leagues;
create policy "read leagues" on public.leagues for select using (true);
drop policy if exists "create leagues" on public.leagues;
create policy "create leagues" on public.leagues for insert with check (auth.uid() is not null);
drop policy if exists "read league players" on public.league_players;
create policy "read league players" on public.league_players for select using (true);
drop policy if exists "join leagues" on public.league_players;
create policy "join leagues" on public.league_players for insert with check (auth.uid() = user_id);
drop policy if exists "read fixtures" on public.league_fixtures;
create policy "read fixtures" on public.league_fixtures for select using (true);
drop policy if exists "report fixtures" on public.league_fixtures;
create policy "report fixtures" on public.league_fixtures for update using (true);
drop policy if exists "create fixtures" on public.league_fixtures;
create policy "create fixtures" on public.league_fixtures for insert with check (true);

-- tournaments
drop policy if exists "read tournaments" on public.tournaments;
create policy "read tournaments" on public.tournaments for select using (true);
drop policy if exists "create tournaments" on public.tournaments;
create policy "create tournaments" on public.tournaments for insert with check (auth.uid() is not null);
drop policy if exists "read t matches" on public.tournament_matches;
create policy "read t matches" on public.tournament_matches for select using (true);
drop policy if exists "update t matches" on public.tournament_matches;
create policy "update t matches" on public.tournament_matches for update using (true);
drop policy if exists "insert t matches" on public.tournament_matches;
create policy "insert t matches" on public.tournament_matches for insert with check (true);
drop policy if exists "read entries" on public.tournament_entries;
create policy "read entries" on public.tournament_entries for select using (true);
drop policy if exists "enter tournaments" on public.tournament_entries;
create policy "enter tournaments" on public.tournament_entries for insert with check (auth.uid() = user_id);

-- analytics: append-only
drop policy if exists "log events" on public.app_events;
create policy "log events" on public.app_events for insert with check (true);

-- ============ Performance indexes ============
create index if not exists idx_matches_venue_time on public.matches (venue_id, played_at desc);
create index if not exists idx_matches_user_time on public.matches (user_id, played_at desc);
create index if not exists idx_profiles_last_seen on public.profiles (last_seen desc);
create index if not exists idx_league_fixtures_league on public.league_fixtures (league_id, round);
create index if not exists idx_tournament_matches_t on public.tournament_matches (tournament_id, round, slot);

-- ============ Auto-create profile on signup ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, nickname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============ POPIA / GDPR: self-service account deletion ============
create or replace function public.delete_own_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from public.league_players where user_id = auth.uid();
  delete from public.tournament_entries where user_id = auth.uid();
  delete from public.venue_players where user_id = auth.uid();
  update public.league_fixtures set home_user = null where home_user = auth.uid();
  update public.league_fixtures set away_user = null where away_user = auth.uid();
  delete from public.matches where user_id = auth.uid();
  delete from public.games where user_id = auth.uid();
  delete from public.app_events where user_id = auth.uid();
  delete from public.profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;
