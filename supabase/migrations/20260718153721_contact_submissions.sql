create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) between 3 and 254),
  topic text not null check (topic in ('general', 'account', 'security', 'privacy', 'partnership')),
  subject text not null check (char_length(subject) between 3 and 160),
  message text not null check (char_length(message) between 20 and 5000),
  status text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index contact_submissions_status_created_at_idx
  on public.contact_submissions (status, created_at desc, id desc);

create table public.contact_submission_rate_limits (
  client_hash text primary key check (char_length(client_hash) = 64),
  window_started_at timestamptz not null,
  submission_count integer not null check (submission_count >= 1),
  updated_at timestamptz not null
);

alter table public.contact_submissions enable row level security;
alter table public.contact_submission_rate_limits enable row level security;

revoke all on table public.contact_submissions from public;
revoke all on table public.contact_submission_rate_limits from public;
revoke all on table public.contact_submissions from anon, authenticated;
revoke all on table public.contact_submission_rate_limits from anon, authenticated;
grant select, insert, update on table public.contact_submissions to service_role;
grant select, insert, update, delete on table public.contact_submission_rate_limits to service_role;

create or replace function public.submit_contact_message(
  p_name text,
  p_email text,
  p_topic text,
  p_subject text,
  p_message text,
  p_client_hash text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_submission_id uuid;
begin
  insert into public.contact_submission_rate_limits (
    client_hash,
    window_started_at,
    submission_count,
    updated_at
  ) values (
    p_client_hash,
    v_now,
    1,
    v_now
  )
  on conflict (client_hash) do update set
    window_started_at = case
      when public.contact_submission_rate_limits.window_started_at <= v_now - interval '1 hour' then v_now
      else public.contact_submission_rate_limits.window_started_at
    end,
    submission_count = case
      when public.contact_submission_rate_limits.window_started_at <= v_now - interval '1 hour' then 1
      else public.contact_submission_rate_limits.submission_count + 1
    end,
    updated_at = v_now
  returning submission_count into v_count;

  if v_count > 5 then
    raise exception 'CONTACT_RATE_LIMITED' using errcode = 'P0001';
  end if;

  insert into public.contact_submissions (name, email, topic, subject, message)
  values (p_name, p_email, p_topic, p_subject, p_message)
  returning id into v_submission_id;

  return v_submission_id;
end;
$$;

revoke all on function public.submit_contact_message(text, text, text, text, text, text) from public;
revoke all on function public.submit_contact_message(text, text, text, text, text, text) from anon, authenticated;
grant execute on function public.submit_contact_message(text, text, text, text, text, text) to service_role;
