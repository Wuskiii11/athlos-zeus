-- ATHLOS — club / coaches / athletes data model + seed.
-- Run this ONCE in the Supabase dashboard (SQL Editor → Run).
-- Safe to re-run (idempotent: IF NOT EXISTS / ON CONFLICT / DROP POLICY IF EXISTS).
-- Auth accounts referenced below were created via scripts/create-athletes.mjs:
--   coach@athlos.si .......... 2f2a6a12-a7a0-452a-9658-3e1c5796755c
--   luka@athlos.si ........... 03a71e08-f878-4ff6-b3b3-c3aaf95d9537
--   nina@athlos.si ........... a0aa70e5-7969-4771-91f6-4b2892b81dfb
--   tim@athlos.si ............ 7ce13c2a-c64c-437b-93c2-b00f0a67133f
--   eva@athlos.si ............ d53e2f5c-4899-46c2-bb9c-3a52bf3e9649
--   jure@athlos.si ........... c84cb768-e5d8-429d-9058-d29414306415
--   ana@athlos.si ............ d86992d7-dd12-4ed3-b958-043e1ed2910b
--   marko@athlos.si .......... 88c77a08-eb88-47e8-9574-881cf7d6f61e
-- All passwords: athlos123  (coach: coach123)

-- ─────────────────────────── tables ───────────────────────────
create table if not exists public.clubs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  logo       text,                       -- storage URL
  created_at timestamptz default now()
);

create table if not exists public.coaches (
  id         uuid primary key references auth.users (id) on delete cascade,
  club_id    uuid references public.clubs (id) on delete set null,
  name       text,
  role       text default 'Glavni trener',
  photo      text,                       -- storage URL
  created_at timestamptz default now()
);

create table if not exists public.athletes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,  -- the athlete's own login
  club_id    uuid references public.clubs (id) on delete set null,
  coach_id   uuid references public.coaches (id) on delete set null,
  initials   text,
  name       text not null,
  username   text,
  note       text,
  readiness  int,
  status     text,                       -- ready | slightly-tired | tired
  weight_kg  numeric,
  is_private boolean default false,
  photo      text,                       -- storage URL
  created_at timestamptz default now()
);

-- ─────────────────────────── RLS ───────────────────────────
alter table public.clubs    enable row level security;
alter table public.coaches  enable row level security;
alter table public.athletes enable row level security;

-- clubs: any logged-in user can read
drop policy if exists "clubs read" on public.clubs;
create policy "clubs read" on public.clubs for select to authenticated using (true);

-- coaches: read all (athletes need their coach); write only your own row
drop policy if exists "coaches read"  on public.coaches;
drop policy if exists "coaches write" on public.coaches;
drop policy if exists "coaches upd"   on public.coaches;
create policy "coaches read"  on public.coaches for select to authenticated using (true);
create policy "coaches write" on public.coaches for insert to authenticated with check (id = auth.uid());
create policy "coaches upd"   on public.coaches for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- athletes: read all (single-club demo); an athlete updates their own row,
-- a coach updates athletes that belong to them.
drop policy if exists "athletes read"   on public.athletes;
drop policy if exists "athletes self"   on public.athletes;
drop policy if exists "athletes coach"  on public.athletes;
drop policy if exists "athletes cins"   on public.athletes;
create policy "athletes read"  on public.athletes for select to authenticated using (true);
create policy "athletes self"  on public.athletes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "athletes coach" on public.athletes for update to authenticated using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "athletes cins"  on public.athletes for insert to authenticated with check (coach_id = auth.uid());

-- ─────────────────────────── storage (avatars) ───────────────────────────
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists "avatars read"  on storage.objects;
drop policy if exists "avatars write" on storage.objects;
drop policy if exists "avatars upd"   on storage.objects;
create policy "avatars read"  on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars write" on storage.objects for insert to authenticated with check (bucket_id = 'avatars');
create policy "avatars upd"   on storage.objects for update to authenticated using (bucket_id = 'avatars') with check (bucket_id = 'avatars');

-- ─────────────────────────── seed ───────────────────────────
insert into public.clubs (id, name) values
  ('a1111111-1111-1111-1111-111111111111', 'NK Domžale')
  on conflict (id) do nothing;

insert into public.coaches (id, club_id, name, role) values
  ('2f2a6a12-a7a0-452a-9658-3e1c5796755c', 'a1111111-1111-1111-1111-111111111111', 'Coach Matej', 'Glavni trener')
  on conflict (id) do update set club_id = excluded.club_id, name = excluded.name;

insert into public.athletes (user_id, club_id, coach_id, initials, name, username, note, readiness, status, weight_kg, is_private) values
  ('03a71e08-f878-4ff6-b3b3-c3aaf95d9537','a1111111-1111-1111-1111-111111111111','2f2a6a12-a7a0-452a-9658-3e1c5796755c','LK','Luka Kovač','luka.kovac','Ready · last training today',92,'ready',75.0,false),
  ('a0aa70e5-7969-4771-91f6-4b2892b81dfb','a1111111-1111-1111-1111-111111111111','2f2a6a12-a7a0-452a-9658-3e1c5796755c','NM','Nina Mlakar','nina.mlakar','Ready · recovery good',88,'ready',62.4,false),
  ('7ce13c2a-c64c-437b-93c2-b00f0a67133f','a1111111-1111-1111-1111-111111111111','2f2a6a12-a7a0-452a-9658-3e1c5796755c','TŽ','Tim Žagar','tim.zagar','Slightly tired · 6h of sleep',71,'slightly-tired',80.1,false),
  ('d53e2f5c-4899-46c2-bb9c-3a52bf3e9649','a1111111-1111-1111-1111-111111111111','2f2a6a12-a7a0-452a-9658-3e1c5796755c','EH','Eva Horvat','eva.horvat','Ready',85,'ready',58.6,true),
  ('c84cb768-e5d8-429d-9058-d29414306415','a1111111-1111-1111-1111-111111111111','2f2a6a12-a7a0-452a-9658-3e1c5796755c','JN','Jure Novak','jure.novak','Tired · rest recommended',48,'tired',84.3,false),
  ('d86992d7-dd12-4ed3-b958-043e1ed2910b','a1111111-1111-1111-1111-111111111111','2f2a6a12-a7a0-452a-9658-3e1c5796755c','AK','Ana Kos','ana.kos','Ready',96,'ready',60.2,false),
  ('88c77a08-eb88-47e8-9574-881cf7d6f61e','a1111111-1111-1111-1111-111111111111','2f2a6a12-a7a0-452a-9658-3e1c5796755c','MP','Marko Potočnik','marko.potocnik','Slightly tired',71,'slightly-tired',77.8,true)
  on conflict do nothing;
