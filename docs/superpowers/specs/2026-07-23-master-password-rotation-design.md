# Master Password Rotation Design

**Date:** 2026-07-23
**Status:** Approved for implementation planning
**Scope:** A "Change master password" flow in Settings > Security that re-encrypts the entire vault

Note on prior constraint: the 2026-07-13 Settings design explicitly stated the master-key encryption model would not be "changed, reset, rotated, migrated, or recovered." This project reverses that constraint deliberately, at the user's request. Everything else from that design (settings layout, navigation) is unaffected and still applies.

## 1. Goal

Let a signed-in user change their vault master password from Settings, with every existing encrypted item (passwords, secure notes, wallet/bank records, and documents) re-encrypted under the new password. The master password is a zero-knowledge secret never sent to or derivable by the server, so this entire operation is orchestrated client-side, with the server only ever handling already-re-encrypted ciphertext.

The account sign-in password (Supabase Auth) is a separate secret from the vault master password (confirmed in `AuthGateway.tsx`'s own copy: "Your vault master key is entered separately after signing in"). This feature does not touch `supabase.auth` in any way.

## 2. Why This Is Different From a Normal Feature

Every encrypted row in this app derives its AES-256-GCM key independently via PBKDF2 from `(masterPassword, that row's own random salt)` (`src/lib/crypto.ts`) - there is no single cached "vault key." Changing the master password therefore requires decrypting and re-encrypting *every* row across four tables, plus every document blob in R2. A bug here has no server-side recovery path: this is zero-knowledge, so there is no plaintext backup the server can fall back to. The design prioritizes atomicity and completeness-checking over speed or code reuse of the app's normal direct-Supabase-write pattern.

## 3. Data Touched

| Table | Encrypted column(s) | Notes |
|---|---|---|
| `vault_items` | `encrypted_data`, `iv`, `salt` | Passwords |
| `secure_notes` | `encrypted_content`, `iv`, `salt` | |
| `secure_wallet` | `encrypted_content`, `iv`, `salt` | Cards + bank accounts, shared table (`type` column) |
| `vault_documents` | `iv`, `salt`, `storage_path` | Actual bytes live in R2, not the DB - the row only points at the object |

## 4. Atomicity: a `SECURITY DEFINER` Postgres Function

A Next.js API route cannot make multiple HTTP calls atomic. Instead, reuse the pattern already proven this session (`resolve_billing_reconciliation_issue`): one `plpgsql` function, `rotate_master_key_ciphertexts`, does all four table updates in a single implicit transaction. Any raised exception rolls back everything - the vault is left fully intact and readable with the *old* password.

```sql
create or replace function public.rotate_master_key_ciphertexts(
  p_items jsonb,      -- [{id, encrypted_data, iv, salt}, ...]
  p_notes jsonb,      -- [{id, encrypted_content, iv, salt}, ...]
  p_wallet jsonb,      -- [{id, encrypted_content, iv, salt}, ...]
  p_documents jsonb    -- [{id, storage_path, iv, salt}, ...]
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
begin
  -- Completeness check FIRST: if the payload is missing even one row that
  -- exists server-side for this user, refuse the whole operation. A silent
  -- gap here would permanently orphan that item, still encrypted with a
  -- password the client is about to discard from memory.
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

  -- Each update is scoped to auth.uid() as well as id, so a payload can
  -- never touch another user's row even if an id were guessed/forged.
  -- Each UPDATE's affected-row count is also checked against the expected
  -- count (GET DIAGNOSTICS ... ROW_COUNT) - exact wiring left to the
  -- implementation plan (see section 8) - so a payload that names an id
  -- that doesn't actually belong to this user fails the whole transaction
  -- instead of silently updating fewer rows than intended.
  update public.vault_items as t
  set encrypted_data = r.encrypted_data, iv = r.iv, salt = r.salt, updated_at = now()
  from jsonb_to_recordset(p_items) as r(id uuid, encrypted_data text, iv text, salt text)
  where t.id = r.id and t.user_id = auth.uid();

  update public.secure_notes as t
  set encrypted_content = r.encrypted_content, iv = r.iv, salt = r.salt, updated_at = now()
  from jsonb_to_recordset(p_notes) as r(id uuid, encrypted_content text, iv text, salt text)
  where t.id = r.id and t.user_id = auth.uid();

  update public.secure_wallet as t
  set encrypted_content = r.encrypted_content, iv = r.iv, salt = r.salt, updated_at = now()
  from jsonb_to_recordset(p_wallet) as r(id uuid, encrypted_content text, iv text, salt text)
  where t.id = r.id and t.user_id = auth.uid();

  update public.vault_documents as t
  set storage_path = r.storage_path, iv = r.iv, salt = r.salt, updated_at = now()
  from jsonb_to_recordset(p_documents) as r(id uuid, storage_path text, iv text, salt text)
  where t.id = r.id and t.user_id = auth.uid();
end;
$$;

revoke all on function public.rotate_master_key_ciphertexts(jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.rotate_master_key_ciphertexts(jsonb, jsonb, jsonb, jsonb) to authenticated;
```

The exact row-count-matched-per-update verification (not just total array length) needs to be nailed down precisely during implementation planning - a row whose `id` doesn't match any existing row for that user should also fail the whole transaction, not silently no-op. This is called directly via `supabase.rpc(...)` from the authenticated client, same as the session-management RPCs built earlier this session - no new Next.js API route needed.

## 5. Client-Side Flow

1. **Entry point:** Settings > Security, a new "Change master password" row/button, opening a dedicated `AdaptiveSheet` (or its own settings section).
2. **Current password field:** verified by attempting to decrypt one real item client-side (reusing the existing `backupMatchesMasterKey`-style heuristic already used in the restore flow). Wrong password -> clear error, nothing else happens.
3. **New password + confirm fields:** reuse the existing strength-check UI/logic from `OnboardingFlow.tsx` (same minimum strength bar, same "hint can't contain the key" constraint carried forward for the *existing* hint - the hint itself is left untouched by this flow, out of scope).
4. **Dismissible backup reminder:** a banner linking to the existing Data & Backup export, not blocking.
5. **On submit**, in order:
   a. Fetch + decrypt every row (`vault_items`, `secure_notes`, `secure_wallet`) with the OLD password.
   b. Fetch + decrypt every document: `requestDownloadUrl` -> `downloadFromPresignedUrl` -> `decryptFile` (same helpers `vaultBackup.ts`/`vaultRestore.ts` already use).
   c. Re-encrypt everything with the NEW password (fresh salt/IV per row, via the existing `encryptText`/`encryptFile`).
   d. Upload re-encrypted document bytes to **new** R2 keys via `requestUploadUrl`/`uploadToPresignedUrl` - old keys are left alone at this point.
   e. Call `rotate_master_key_ciphertexts` with all four payloads.
   f. On success: best-effort delete the old R2 document objects (reuse the existing bulk-delete storage route/helper already used elsewhere - `chunkValues` bounded-batch pattern). A failure to clean up old blobs is logged, not surfaced as an error - the rotation itself already succeeded.
   g. On success: clear PIN (`clearPinLock()`) and biometrics (`disableBiometrics()`) locally, since both wrap the old password. Show a clear, non-alarming notice: "PIN and Face ID / Touch ID were turned off since they were tied to your old master key - set them up again from Settings whenever you'd like."
   h. On success: update the in-memory master key (`setMasterKey`/`VaultKeyProvider`) to the new password so the current session keeps working without forcing a re-login.
   i. On any failure at any step before 5e: nothing has been written to the database - abort cleanly, show an error, leave the vault exactly as it was. (Newly-uploaded-but-uncommitted R2 blobs from step d, if the RPC in step e fails, are orphaned but harmless since nothing points at them - best-effort cleanup, not critical.)
6. **Progress indicator** throughout step 5, especially for documents (can be slow for many/large files) - reuse the same progress-callback UI pattern already built for backup export in `BackupSettings.tsx`.

## 6. Explicit Non-Goals

- Does not touch the Supabase Auth sign-in password.
- Does not attempt to carry over PIN/biometric unlock automatically - both are cleared and must be re-enabled manually afterward (simpler and safer than re-deriving trust without re-proving the PIN/biometric).
- Does not modify or clear the master key hint automatically.
- Does not add a cross-device or cross-tab warning system beyond what already exists (PIN/biometric are already per-device, so other devices simply keep needing their own re-setup after this, same as any other device losing its local PIN/biometric wrapper).

## 7. Testing Considerations

- A test asserting the RPC's completeness check rejects a payload with an incorrect row count for any of the four tables.
- A test asserting rows are scoped by both `id` and `user_id` (no cross-user write possible even with a forged id).
- A test asserting the client clears PIN/biometric locally only after a *successful* rotation, never before or on failure.
- A test asserting the in-memory master key only updates after a successful rotation.

## 8. Open Items For The Implementation Plan

- The exact per-row match verification inside the SQL function (not just array-length parity) needs to be spelled out precisely - e.g. checking each `UPDATE ... RETURNING` count matches the expected count.
- Whether document re-encryption should have a size/count ceiling per rotation attempt (e.g. warn if the vault has an unusually large number of large documents, since this all happens in one browser session before anything commits).
- Exact UI copy for the PIN/biometric-cleared notice and the progress indicator's per-stage labels.
