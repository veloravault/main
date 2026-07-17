-- Ticket-based support system. Members (active only) can open a ticket and
-- reply on their own thread; only the service role (the admin API routes,
-- gated by requireAdmin()) can reply as the owner or change ticket status —
-- matching the same "admin actions never go through client-side RLS alone"
-- convention as app_members mutation.

create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  last_message_at timestamptz not null default now(),
  last_message_by text not null default 'member' check (last_message_by in ('member', 'owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets (status, last_message_at desc);

create table if not exists public.support_ticket_messages (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references public.support_tickets(id) on delete cascade not null,
  sender text not null check (sender in ('member', 'owner')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_messages_ticket_idx on public.support_ticket_messages (ticket_id, created_at asc);

-- Keep the parent ticket's summary fields in sync with its latest message.
-- security definer: members only have select/insert on support_tickets, not
-- update, so this runs with elevated privilege to perform the one specific,
-- controlled update a new message implies.
create or replace function public.touch_support_ticket_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.support_tickets
  set
    last_message_at = new.created_at,
    last_message_by = new.sender,
    status = case when new.sender = 'member' then 'open' else status end,
    updated_at = now()
  where id = new.ticket_id;
  return new;
end;
$$;

revoke all on function public.touch_support_ticket_on_message() from public, anon, authenticated;

drop trigger if exists support_ticket_message_touch on public.support_ticket_messages;
create trigger support_ticket_message_touch
after insert on public.support_ticket_messages
for each row execute function public.touch_support_ticket_on_message();

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

revoke all on public.support_tickets, public.support_ticket_messages from anon, authenticated;

grant select, insert on public.support_tickets to authenticated;
grant select, insert on public.support_ticket_messages to authenticated;
grant select, insert, update, delete on public.support_tickets, public.support_ticket_messages to service_role;

create policy "Members view their own tickets"
on public.support_tickets for select
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

create policy "Members open their own tickets"
on public.support_tickets for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

create policy "Members view messages on their own tickets"
on public.support_ticket_messages for select
to authenticated
using (
  exists (
    select 1 from public.support_tickets ticket
    where ticket.id = ticket_id
      and ticket.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

create policy "Members reply on their own tickets"
on public.support_ticket_messages for insert
to authenticated
with check (
  sender = 'member'
  and exists (
    select 1 from public.support_tickets ticket
    where ticket.id = ticket_id
      and ticket.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);
