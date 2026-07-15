-- Keep vault tables available through the Data API only to signed-in users
-- and trusted server code. RLS still enforces per-user ownership and active
-- membership for the authenticated role.
revoke all on table
  public.vault_items,
  public.vault_documents,
  public.secure_notes,
  public.secure_wallet
from anon, authenticated;

grant select, insert, update, delete on table
  public.vault_items,
  public.vault_documents,
  public.secure_notes,
  public.secure_wallet
to authenticated, service_role;
