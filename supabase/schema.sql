-- ATHLOS — Supabase shema
-- Zaženi to v Supabase: SQL Editor → New query → prilepi → Run.

-- Tabela profilov (en profil na uporabnika; id = auth uporabnik)
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text,
  sport      text,
  birth      text,
  height     numeric,
  weight     numeric,
  photo      text,            -- base64 ali url; za večje slike kasneje uporabi Storage
  plan       text default 'basic',  -- izbrani naročniški plan (basic/pro/elite)
  lang       text default 'sl',     -- jezik aplikacije (sl/en)
  role       text default 'athlete', -- 'athlete' = navadna app, 'coach' = coach app
  updated_at timestamptz default now()
);

-- Če si shemo zagnal že prej (tabela obstaja brez stolpca "plan"), zaženi še to:
alter table public.profiles add column if not exists plan text default 'basic';
alter table public.profiles add column if not exists lang text default 'sl';
alter table public.profiles add column if not exists role text default 'athlete';
alter table public.profiles add column if not exists theme text; -- 'light' | 'dark' (per-account)
-- Nekoga narediš za coacha (zamenjaj e-naslov):
--   update public.profiles set role = 'coach'
--   where id = (select id from auth.users where email = 'coach@primer.si');

-- Row Level Security: vsak uporabnik vidi/ureja SAMO svoj profil
alter table public.profiles enable row level security;

drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "own profile write"  on public.profiles;
drop policy if exists "own profile update" on public.profiles;

create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile write"  on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Ko se ustvari nov uporabnik, samodejno naredi prazno vrstico profila
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ════════════════════════════════════════════════════════════
-- Sezona: koledarski dogodki (trening / tekma / regeneracija)
-- ════════════════════════════════════════════════════════════
create table if not exists public.season_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null check (type in ('trening','tekma','recovery')),
  title      text not null,
  date       date not null,
  time       text not null default '17:00',
  completed  boolean not null default false,
  created_at timestamptz default now()
);

-- Idempotent: add the column if this table already existed pre-completion-tracking.
alter table public.season_events add column if not exists completed boolean not null default false;

alter table public.season_events enable row level security;

drop policy if exists "own events select" on public.season_events;
drop policy if exists "own events insert" on public.season_events;
drop policy if exists "own events update" on public.season_events;
drop policy if exists "own events delete" on public.season_events;

create policy "own events select" on public.season_events for select using (auth.uid() = user_id);
create policy "own events insert" on public.season_events for insert with check (auth.uid() = user_id);
create policy "own events update" on public.season_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own events delete" on public.season_events for delete using (auth.uid() = user_id);

create index if not exists season_events_user_date on public.season_events (user_id, date);

-- ════════════════════════════════════════════════════════════
-- Opravljeni treningi (zgodovina za statistiko in poročila)
-- ════════════════════════════════════════════════════════════
create table if not exists public.workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  date         date not null default current_date,
  duration_sec integer not null default 0,
  sets_done    integer not null default 0,
  exercises    jsonb,            -- [{name, sets, reps}, ...]
  created_at   timestamptz default now()
);

alter table public.workouts enable row level security;

drop policy if exists "own workouts select" on public.workouts;
drop policy if exists "own workouts insert" on public.workouts;
drop policy if exists "own workouts delete" on public.workouts;

create policy "own workouts select" on public.workouts for select using (auth.uid() = user_id);
create policy "own workouts insert" on public.workouts for insert with check (auth.uid() = user_id);
create policy "own workouts delete" on public.workouts for delete using (auth.uid() = user_id);

create index if not exists workouts_user_date on public.workouts (user_id, date desc);

-- ════════════════════════════════════════════════════════════
-- AI pogovor (zgodovina sporočil AI trenerja)
-- ════════════════════════════════════════════════════════════
create table if not exists public.ai_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz default now()
);

alter table public.ai_messages enable row level security;

drop policy if exists "own ai select" on public.ai_messages;
drop policy if exists "own ai insert" on public.ai_messages;
drop policy if exists "own ai delete" on public.ai_messages;

create policy "own ai select" on public.ai_messages for select using (auth.uid() = user_id);
create policy "own ai insert" on public.ai_messages for insert with check (auth.uid() = user_id);
create policy "own ai delete" on public.ai_messages for delete using (auth.uid() = user_id);

create index if not exists ai_messages_user_time on public.ai_messages (user_id, created_at);

-- ════════════════════════════════════════════════════════════
-- AI trener — UČEČA SE memory baza (en zapis na športnika)
-- `data` (jsonb) hrani: funnel odgovore (cilj, nivo, faza, oprema, dnevi,
-- trajanje, poškodbe) + naučene opombe (notes[]) + povratne informacije
-- s treningov (feedback[]). Agent ga vrine v vsak pogovor in z njim "raste".
-- ════════════════════════════════════════════════════════════
create table if not exists public.coach_memory (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.coach_memory enable row level security;

drop policy if exists "own coach_memory select" on public.coach_memory;
drop policy if exists "own coach_memory insert" on public.coach_memory;
drop policy if exists "own coach_memory update" on public.coach_memory;

create policy "own coach_memory select" on public.coach_memory for select using (auth.uid() = user_id);
create policy "own coach_memory insert" on public.coach_memory for insert with check (auth.uid() = user_id);
create policy "own coach_memory update" on public.coach_memory for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════
-- Chat — conversations, members, messages, blocks
-- ════════════════════════════════════════════════════════════

-- Tables first — the helper function below references conversation_members,
-- and Postgres validates SQL function bodies at creation time.
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('direct', 'group')),
  name        text,
  background  text default 'default',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  joined_at       timestamptz default now(),
  primary key (conversation_id, user_id)
);

-- Security-definer helper: true when auth.uid() is a member of a conversation.
-- Used in RLS policies to avoid infinite recursion.
create or replace function public.is_conversation_member(conv_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conv_id and user_id = auth.uid()
  );
$$;

alter table public.conversations enable row level security;

drop policy if exists "conv member select" on public.conversations;
drop policy if exists "conv member insert" on public.conversations;
drop policy if exists "conv member update" on public.conversations;

-- creator must see the row too: the app inserts the conversation and reads it
-- back BEFORE adding members, so member-only select would break creation
create policy "conv member select" on public.conversations
  for select using (created_by = auth.uid() or public.is_conversation_member(id));
create policy "conv member insert" on public.conversations
  for insert with check (created_by = auth.uid());
create policy "conv member update" on public.conversations
  for update using (public.is_conversation_member(id)) with check (public.is_conversation_member(id));

alter table public.conversation_members enable row level security;

drop policy if exists "cm select" on public.conversation_members;
drop policy if exists "cm insert" on public.conversation_members;
drop policy if exists "cm delete" on public.conversation_members;

create policy "cm select" on public.conversation_members
  for select using (user_id = auth.uid() or public.is_conversation_member(conversation_id));
create policy "cm insert" on public.conversation_members
  for insert with check (
    user_id = auth.uid() or
    exists (select 1 from public.conversations where id = conversation_id and created_by = auth.uid())
  );
create policy "cm delete" on public.conversation_members
  for delete using (user_id = auth.uid());

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  type            text not null default 'text' check (type in ('text','image','video','file','sticker')),
  content         text,
  attachment_url  text,
  created_at      timestamptz default now()
);

alter table public.messages enable row level security;

drop policy if exists "msg select" on public.messages;
drop policy if exists "msg insert" on public.messages;
drop policy if exists "msg delete" on public.messages;

create policy "msg select" on public.messages
  for select using (public.is_conversation_member(conversation_id));
create policy "msg insert" on public.messages
  for insert with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));
create policy "msg delete" on public.messages
  for delete using (sender_id = auth.uid());

create index if not exists messages_conv_time on public.messages (conversation_id, created_at);

create table if not exists public.blocks (
  blocker_id  uuid not null references auth.users(id) on delete cascade,
  blocked_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

alter table public.blocks enable row level security;

drop policy if exists "blocks select" on public.blocks;
drop policy if exists "blocks insert" on public.blocks;
drop policy if exists "blocks delete" on public.blocks;

create policy "blocks select" on public.blocks for select using (blocker_id = auth.uid());
create policy "blocks insert" on public.blocks for insert with check (blocker_id = auth.uid());
create policy "blocks delete" on public.blocks for delete using (blocker_id = auth.uid());

-- Storage bucket for chat attachments (public so image URLs render directly)
insert into storage.buckets (id, name, public) values ('chat-attachments', 'chat-attachments', true)
  on conflict (id) do nothing;

drop policy if exists "chat-attach read"  on storage.objects;
drop policy if exists "chat-attach write" on storage.objects;
create policy "chat-attach read"  on storage.objects for select using (bucket_id = 'chat-attachments');
create policy "chat-attach write" on storage.objects for insert to authenticated with check (bucket_id = 'chat-attachments');

-- Storage bucket for profile avatars (public so the photo URL renders directly)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists "avatars read"  on storage.objects;
drop policy if exists "avatars write" on storage.objects;
drop policy if exists "avatars upd"   on storage.objects;
create policy "avatars read"  on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars write" on storage.objects for insert to authenticated with check (bucket_id = 'avatars');
create policy "avatars upd"   on storage.objects for update to authenticated using (bucket_id = 'avatars') with check (bucket_id = 'avatars');
