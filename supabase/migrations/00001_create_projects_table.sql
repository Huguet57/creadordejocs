create table if not exists public.projects (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  name text not null default '',
  project_source text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create index if not exists idx_projects_user_updated_at
  on public.projects (user_id, updated_at desc);

alter table public.projects enable row level security;

create policy "users_select_own" on public.projects
for select to authenticated using (user_id = auth.uid());

create policy "users_insert_own" on public.projects
for insert to authenticated with check (user_id = auth.uid());

create policy "users_update_own" on public.projects
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users_delete_own" on public.projects
for delete to authenticated using (user_id = auth.uid());
