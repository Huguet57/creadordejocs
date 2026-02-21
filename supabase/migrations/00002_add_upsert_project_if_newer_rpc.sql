create or replace function public.upsert_project_if_newer(
  p_user_id uuid,
  p_project_id uuid,
  p_name text,
  p_project_source text,
  p_updated_at timestamptz
)
returns table(updated_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_effective_updated_at timestamptz;
begin
  insert into public.projects (
    user_id,
    project_id,
    name,
    project_source,
    updated_at
  )
  values (
    p_user_id,
    p_project_id,
    p_name,
    p_project_source,
    p_updated_at
  )
  on conflict (user_id, project_id)
  do update
  set
    name = excluded.name,
    project_source = excluded.project_source,
    updated_at = excluded.updated_at
  where excluded.updated_at > public.projects.updated_at
  returning public.projects.updated_at
  into v_effective_updated_at;

  if v_effective_updated_at is null then
    select projects.updated_at
    into v_effective_updated_at
    from public.projects as projects
    where projects.user_id = p_user_id
      and projects.project_id = p_project_id;
  end if;

  return query select v_effective_updated_at;
end;
$$;

grant execute on function public.upsert_project_if_newer(uuid, uuid, text, text, timestamptz) to authenticated;
