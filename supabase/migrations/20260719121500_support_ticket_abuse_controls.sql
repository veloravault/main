-- Ticket subjects were unbounded and creation/replies went straight through
-- client-side RLS inserts with no rate limit. Bound the subject length and
-- move creation/reply behind rate-limited security-definer functions, the
-- same pattern public.submit_contact_message already uses for the public
-- contact form.

alter table public.support_tickets
  add constraint support_tickets_subject_length check (char_length(subject) between 3 and 160);

create table public.support_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ticket_window_started_at timestamptz not null default now(),
  ticket_count integer not null default 0,
  message_window_started_at timestamptz not null default now(),
  message_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.support_rate_limits enable row level security;
revoke all on table public.support_rate_limits from public, anon, authenticated;
grant select, insert, update on table public.support_rate_limits to service_role;

create or replace function public.create_support_ticket(p_subject text, p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_ticket_count integer;
  v_ticket_id uuid;
begin
  if not exists (
    select 1 from public.app_members member
    where member.user_id = auth.uid() and member.status = 'active'
  ) then
    raise exception 'SUPPORT_NOT_ACTIVE_MEMBER' using errcode = 'P0001';
  end if;

  if p_subject is null or char_length(p_subject) < 3 or char_length(p_subject) > 160 then
    raise exception 'SUPPORT_INVALID_SUBJECT' using errcode = 'P0001';
  end if;
  if p_message is null or char_length(p_message) < 1 or char_length(p_message) > 4000 then
    raise exception 'SUPPORT_INVALID_MESSAGE' using errcode = 'P0001';
  end if;

  insert into public.support_rate_limits (user_id, ticket_window_started_at, ticket_count, updated_at)
  values (auth.uid(), v_now, 1, v_now)
  on conflict (user_id) do update set
    ticket_window_started_at = case
      when public.support_rate_limits.ticket_window_started_at <= v_now - interval '1 hour' then v_now
      else public.support_rate_limits.ticket_window_started_at
    end,
    ticket_count = case
      when public.support_rate_limits.ticket_window_started_at <= v_now - interval '1 hour' then 1
      else public.support_rate_limits.ticket_count + 1
    end,
    updated_at = v_now
  returning ticket_count into v_ticket_count;

  if v_ticket_count > 5 then
    raise exception 'SUPPORT_TICKET_RATE_LIMITED' using errcode = 'P0001';
  end if;

  insert into public.support_tickets (user_id, subject)
  values (auth.uid(), p_subject)
  returning id into v_ticket_id;

  insert into public.support_ticket_messages (ticket_id, sender, body)
  values (v_ticket_id, 'member', p_message);

  return v_ticket_id;
end;
$$;

revoke all on function public.create_support_ticket(text, text) from public, anon, authenticated;
grant execute on function public.create_support_ticket(text, text) to authenticated;

create or replace function public.reply_support_ticket(p_ticket_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_message_count integer;
  v_message_id uuid;
begin
  if not exists (
    select 1 from public.support_tickets ticket
    where ticket.id = p_ticket_id and ticket.user_id = auth.uid()
  ) then
    raise exception 'SUPPORT_TICKET_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.app_members member
    where member.user_id = auth.uid() and member.status = 'active'
  ) then
    raise exception 'SUPPORT_NOT_ACTIVE_MEMBER' using errcode = 'P0001';
  end if;
  if p_body is null or char_length(p_body) < 1 or char_length(p_body) > 4000 then
    raise exception 'SUPPORT_INVALID_MESSAGE' using errcode = 'P0001';
  end if;

  insert into public.support_rate_limits (user_id, message_window_started_at, message_count, updated_at)
  values (auth.uid(), v_now, 1, v_now)
  on conflict (user_id) do update set
    message_window_started_at = case
      when public.support_rate_limits.message_window_started_at <= v_now - interval '1 hour' then v_now
      else public.support_rate_limits.message_window_started_at
    end,
    message_count = case
      when public.support_rate_limits.message_window_started_at <= v_now - interval '1 hour' then 1
      else public.support_rate_limits.message_count + 1
    end,
    updated_at = v_now
  returning message_count into v_message_count;

  if v_message_count > 20 then
    raise exception 'SUPPORT_MESSAGE_RATE_LIMITED' using errcode = 'P0001';
  end if;

  insert into public.support_ticket_messages (ticket_id, sender, body)
  values (p_ticket_id, 'member', p_body)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

revoke all on function public.reply_support_ticket(uuid, text) from public, anon, authenticated;
grant execute on function public.reply_support_ticket(uuid, text) to authenticated;

-- Creation and replies now happen only through the rate-limited functions
-- above; direct table inserts from the client are no longer needed or granted.
drop policy if exists "Members open their own tickets" on public.support_tickets;
drop policy if exists "Members reply on their own tickets" on public.support_ticket_messages;
revoke insert on public.support_tickets from authenticated;
revoke insert on public.support_ticket_messages from authenticated;
