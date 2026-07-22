-- Changing the master password means every encrypted row across four
-- tables must be decrypted (old password) and re-encrypted (new password)
-- client-side, since this is zero-knowledge - the server never sees either
-- password or any plaintext. This function is where that re-encrypted
-- ciphertext actually gets committed, and it has to be all-or-nothing:
-- a client-only sequence of per-row updates could be interrupted halfway,
-- leaving some rows on the old password and some on the new one with no
-- way to tell which. A single plpgsql function gives us one implicit
-- transaction for free - any raised exception rolls back everything.
--
-- Two failure modes are guarded against explicitly:
--   1. The payload is missing rows entirely (a client bug) - checked by
--      comparing array lengths against a fresh count for this user BEFORE
--      touching anything.
--   2. The payload names an id that doesn't actually belong to this user
--      (forged or stale) - an UPDATE scoped by user_id would just silently
--      match fewer rows than expected, so each UPDATE's row count is
--      checked against the expected count immediately after.

create or replace function public.rotate_master_key_ciphertexts(
  p_items jsonb,
  p_notes jsonb,
  p_wallet jsonb,
  p_documents jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expected_items int;
  v_expected_notes int;
  v_expected_wallet int;
  v_expected_documents int;
  v_updated int;
begin
  select count(*) into v_expected_items from public.vault_items where user_id = auth.uid();
  select count(*) into v_expected_notes from public.secure_notes where user_id = auth.uid();
  select count(*) into v_expected_wallet from public.secure_wallet where user_id = auth.uid();
  select count(*) into v_expected_documents from public.vault_documents where user_id = auth.uid();

  if jsonb_array_length(p_items) != v_expected_items
    or jsonb_array_length(p_notes) != v_expected_notes
    or jsonb_array_length(p_wallet) != v_expected_wallet
    or jsonb_array_length(p_documents) != v_expected_documents
  then
    raise exception 'ROTATION_PAYLOAD_INCOMPLETE' using errcode = 'P0001';
  end if;

  update public.vault_items as t
  set encrypted_data = r.encrypted_data, iv = r.iv, salt = r.salt, updated_at = now()
  from jsonb_to_recordset(p_items) as r(id uuid, encrypted_data text, iv text, salt text)
  where t.id = r.id and t.user_id = auth.uid();
  get diagnostics v_updated = row_count;
  if v_updated != v_expected_items then
    raise exception 'ROTATION_PAYLOAD_MISMATCH' using errcode = 'P0002';
  end if;

  update public.secure_notes as t
  set encrypted_content = r.encrypted_content, iv = r.iv, salt = r.salt, updated_at = now()
  from jsonb_to_recordset(p_notes) as r(id uuid, encrypted_content text, iv text, salt text)
  where t.id = r.id and t.user_id = auth.uid();
  get diagnostics v_updated = row_count;
  if v_updated != v_expected_notes then
    raise exception 'ROTATION_PAYLOAD_MISMATCH' using errcode = 'P0002';
  end if;

  update public.secure_wallet as t
  set encrypted_content = r.encrypted_content, iv = r.iv, salt = r.salt, updated_at = now()
  from jsonb_to_recordset(p_wallet) as r(id uuid, encrypted_content text, iv text, salt text)
  where t.id = r.id and t.user_id = auth.uid();
  get diagnostics v_updated = row_count;
  if v_updated != v_expected_wallet then
    raise exception 'ROTATION_PAYLOAD_MISMATCH' using errcode = 'P0002';
  end if;

  update public.vault_documents as t
  set storage_path = r.storage_path, iv = r.iv, salt = r.salt, updated_at = now()
  from jsonb_to_recordset(p_documents) as r(id uuid, storage_path text, iv text, salt text)
  where t.id = r.id and t.user_id = auth.uid();
  get diagnostics v_updated = row_count;
  if v_updated != v_expected_documents then
    raise exception 'ROTATION_PAYLOAD_MISMATCH' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.rotate_master_key_ciphertexts(jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.rotate_master_key_ciphertexts(jsonb, jsonb, jsonb, jsonb) to authenticated;
