create table if not exists public.workbench_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.workbench_snapshots enable row level security;

revoke all on table public.workbench_snapshots from anon;
grant select, insert, update, delete
  on table public.workbench_snapshots
  to authenticated;

create policy "Users can read their own workbench"
  on public.workbench_snapshots
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own workbench"
  on public.workbench_snapshots
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own workbench"
  on public.workbench_snapshots
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own workbench"
  on public.workbench_snapshots
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.bump_workbench_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.revision = old.revision + 1;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bump_workbench_revision on public.workbench_snapshots;
create trigger bump_workbench_revision
before update on public.workbench_snapshots
for each row execute function public.bump_workbench_revision();

alter publication supabase_realtime add table public.workbench_snapshots;
