-- secure_credentials (the five new SSH key / crypto passphrase / API
-- credential / WiFi password / 2FA backup code types) must participate in
-- master password rotation exactly like the other four tables - otherwise
-- any row in it is silently left encrypted under the OLD password forever,
-- since the client discards the old password from memory once rotation
-- completes. Postgres treats a different parameter list as a distinct
-- function overload rather than a true replacement, so the old 4-parameter
-- version is dropped outright before creating the 5-parameter version -
-- leaving it around would be dead code with live SECURITY DEFINER grants.
drop function if exists public.rotate_master_key_ciphertexts(jsonb, jsonb, jsonb, jsonb);

create function public.rotate_master_key_ciphertexts(
  p_items jsonb,
  p_notes jsonb,
  p_wallet jsonb,
  p_documents jsonb,
  p_credentials jsonb
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
  v_expected_credentials int;
  v_updated int;
begin
  select count(*) into v_expected_items from public.vault_items where user_id = auth.uid();
  select count(*) into v_expected_notes from public.secure_notes where user_id = auth.uid();
  select count(*) into v_expected_wallet from public.secure_wallet where user_id = auth.uid();
  select count(*) into v_expected_documents from public.vault_documents where user_id = auth.uid();
  select count(*) into v_expected_credentials from public.secure_credentials where user_id = auth.uid();

  if jsonb_array_length(p_items) != v_expected_items
    or jsonb_array_length(p_notes) != v_expected_notes
    or jsonb_array_length(p_wallet) != v_expected_wallet
    or jsonb_array_length(p_documents) != v_expected_documents
    or jsonb_array_length(p_credentials) != v_expected_credentials
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

  update public.secure_credentials as t
  set encrypted_content = r.encrypted_content, iv = r.iv, salt = r.salt, updated_at = now()
  from jsonb_to_recordset(p_credentials) as r(id uuid, encrypted_content text, iv text, salt text)
  where t.id = r.id and t.user_id = auth.uid();
  get diagnostics v_updated = row_count;
  if v_updated != v_expected_credentials then
    raise exception 'ROTATION_PAYLOAD_MISMATCH' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.rotate_master_key_ciphertexts(jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.rotate_master_key_ciphertexts(jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;
