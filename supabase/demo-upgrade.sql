-- ATHLOS — demo upgrade: real clubs + community.
-- Run ONCE in the Supabase dashboard (SQL Editor → Run). Idempotent.
--
-- Adds:
--  1. clubs.location + clubs.conversation_id (the club's group chat)
--  2. clubs insert/update policies so a coach can create + edit their club
--  3. athletes self-join / self-leave policies (an athlete joins a club
--     from the Community tab; before, only the coach could insert rows)

-- ── 1. columns ────────────────────────────────────────────────
alter table public.clubs add column if not exists location text;
alter table public.clubs add column if not exists conversation_id uuid references public.conversations (id) on delete set null;

-- ── 2. clubs policies ─────────────────────────────────────────
-- Only a coach-role account may create a club — role itself is
-- developer/SQL-editor controlled (see lock_profile_role in schema.sql), and
-- the app's coach-onboarding UI is already gated on profile.role === "coach"
-- (App.jsx), so this matches actual usage and closes the direct-API-call hole
-- where any athlete account could insert a club row. Editing stays limited
-- to the club's coach.
drop policy if exists "clubs insert" on public.clubs;
create policy "clubs insert" on public.clubs
  for insert to authenticated with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach')
  );

drop policy if exists "clubs update" on public.clubs;
create policy "clubs update" on public.clubs
  for update to authenticated
  using (exists (select 1 from public.coaches c where c.club_id = clubs.id and c.id = auth.uid()))
  with check (exists (select 1 from public.coaches c where c.club_id = clubs.id and c.id = auth.uid()));

-- ── 3. athletes self-join / self-leave ────────────────────────
drop policy if exists "athletes self join" on public.athletes;
create policy "athletes self join" on public.athletes
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "athletes self leave" on public.athletes;
create policy "athletes self leave" on public.athletes
  for delete to authenticated using (user_id = auth.uid());

-- A coach may also remove athletes from their club.
drop policy if exists "athletes coach remove" on public.athletes;
create policy "athletes coach remove" on public.athletes
  for delete to authenticated using (coach_id = auth.uid());

-- ── 4. daily check-ins — real per-user readiness data ──────────
-- One row per athlete per day: what they actually reported (sleep quality,
-- mood, soreness, stress, hours slept, hydration). This is the ONLY input
-- to a real user's readiness score — no wearable data is fabricated.
-- A brand-new athlete has zero rows here, so their readiness is 0 / "no
-- data yet" until they submit their first check-in.
create table if not exists public.checkins (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  date           date not null,
  sleep_quality  int,   -- 1-5
  mood           int,   -- 1-5
  soreness       int,   -- 1-5
  stress         int,   -- 1-5
  sleep_h        numeric,
  hydration      int,   -- 0-120 %
  created_at     timestamptz default now(),
  unique (user_id, date)
);

alter table public.checkins enable row level security;

drop policy if exists "checkins select" on public.checkins;
drop policy if exists "checkins upsert" on public.checkins;
drop policy if exists "checkins update" on public.checkins;
create policy "checkins select" on public.checkins for select to authenticated using (user_id = auth.uid());
create policy "checkins upsert" on public.checkins for insert to authenticated with check (user_id = auth.uid());
create policy "checkins update" on public.checkins for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists checkins_user_date on public.checkins (user_id, date desc);
