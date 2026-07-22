-- Public personal site projections + invite/waitlist controls

create table if not exists public.public_profile (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  headline text,
  bio text,
  contact_email text,
  resume_url text,
  location text,
  links jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.public_projects (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  goal text,
  role text,
  status text,
  key_results jsonb not null default '[]'::jsonb,
  portfolio_note text,
  material_links jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.public_culture (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  creator text,
  rating numeric,
  opinion text,
  poster_url text,
  tags jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.public_links (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  label text not null,
  url text not null,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.waitlist_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  purpose text,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.invite_codes (
  code text primary key,
  note text,
  max_uses int not null default 1,
  used_count int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.public_profile enable row level security;
alter table public.public_projects enable row level security;
alter table public.public_culture enable row level security;
alter table public.public_links enable row level security;
alter table public.waitlist_applications enable row level security;
alter table public.invite_codes enable row level security;

grant select on table public.public_profile to anon, authenticated;
grant select, insert, update, delete on table public.public_profile to authenticated;

grant select on table public.public_projects to anon, authenticated;
grant select, insert, update, delete on table public.public_projects to authenticated;

grant select on table public.public_culture to anon, authenticated;
grant select, insert, update, delete on table public.public_culture to authenticated;

grant select on table public.public_links to anon, authenticated;
grant select, insert, update, delete on table public.public_links to authenticated;

grant insert on table public.waitlist_applications to anon, authenticated;
-- 候补申请仅服务端/仪表盘可读，不开放 anon/authenticated select

revoke all on table public.invite_codes from anon, authenticated;
-- 邀请码仅通过 consume_invite_code RPC 校验与消耗

-- Public read
create policy "Anyone can read public profiles"
  on public.public_profile for select to anon, authenticated
  using (true);
create policy "Anyone can read public projects"
  on public.public_projects for select to anon, authenticated
  using (true);
create policy "Anyone can read public culture"
  on public.public_culture for select to anon, authenticated
  using (true);
create policy "Anyone can read public links"
  on public.public_links for select to anon, authenticated
  using (true);

-- Owner write
create policy "Owners manage public profile"
  on public.public_profile for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "Owners manage public projects"
  on public.public_projects for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "Owners manage public culture"
  on public.public_culture for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "Owners manage public links"
  on public.public_links for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- Waitlist: anyone can apply, only owner/service can read via dashboard (no select for anon)
create policy "Anyone can submit waitlist"
  on public.waitlist_applications for insert to anon, authenticated
  with check (true);

-- Invite consumption RPC
create or replace function public.consume_invite_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  row_invite public.invite_codes%rowtype;
begin
  select * into row_invite
  from public.invite_codes
  where code = lower(trim(p_code))
  for update;

  if not found then
    return false;
  end if;
  if row_invite.expires_at is not null and row_invite.expires_at < now() then
    return false;
  end if;
  if row_invite.used_count >= row_invite.max_uses then
    return false;
  end if;

  update public.invite_codes
  set used_count = used_count + 1
  where code = row_invite.code;

  return true;
end;
$$;

grant execute on function public.consume_invite_code(text) to anon, authenticated;

-- Seed one invite code (change after first use):
-- insert into public.invite_codes(code, note, max_uses)
-- values ('workbench-demo', 'First beta invite', 5)
-- on conflict (code) do nothing;
