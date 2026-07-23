# Credential Vault Types Design

**Date:** 2026-07-23
**Status:** Approved for implementation planning
**Scope:** Five new vault item types - SSH Keys, Crypto Passphrases, API Keys/Credentials, WiFi Passwords, 2FA Backup Codes

## 1. Goal

Add five new encrypted vault item types, each with full CRUD, search, dashboard, and backup/restore support, matching the baseline feature set every existing item type (Passwords, Documents, Notes, Wallet, Bank Accounts) already has.

## 2. Data Model

### 2.1 One shared table, not five

The five types have an identical outer shape - a title, one encrypted JSON blob holding a handful of named fields, and standard metadata - differing only in what's inside the blob and how it's labeled/iconified in the UI. Five separate tables would mean five near-identical migrations, five sets of RLS policies, and five backup/restore integration points for tables that differ only by name.

This codebase already has precedent for both patterns: `secure_notes` and `vault_documents` are each single-purpose tables, while `secure_wallet` shares one table across `credit_card` and `bank_account` via a `type` discriminator specifically because those two are genuinely both "wallet" concepts. With five new, unrelated-but-structurally-identical types, the `secure_wallet` pattern generalizes better - one table, one `type` check constraint with five values.

```sql
create table public.secure_credentials (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  type text not null check (type in ('ssh_key', 'crypto_wallet', 'api_credential', 'wifi_credential', 'two_factor_backup')),
  encrypted_content text not null,
  iv text not null,
  salt text not null,
  category text default 'Uncategorized',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

RLS policies (select/insert/update/delete, each scoped to `auth.uid() = user_id`) copy `secure_wallet`'s existing policies verbatim, just retargeted at this table.

`user_id ... on delete cascade` means account deletion cleans this table up automatically, same as every other vault table - no changes needed to the delete-account route. There are no R2 files involved (unlike documents), so no storage cleanup path is needed either.

### 2.2 Per-type encrypted content shape

Each row's `encrypted_content` is `JSON.stringify`'d before encryption and `JSON.parse`'d after decryption, exactly like Wallet/Bank items already do:

| Type | Shape |
|---|---|
| `ssh_key` | `{ privateKey, publicKey?, host?, passphrase?, notes? }` |
| `crypto_wallet` | `{ seedPhrase, walletAddress?, notes? }` |
| `api_credential` | `{ serviceName?, apiKey, apiSecret?, notes? }` |
| `wifi_credential` | `{ networkName, password, notes? }` |
| `two_factor_backup` | `{ serviceName?, codes, notes? }` |

Every type has exactly one "primary secret" field masked-by-default with a reveal toggle (`privateKey`, `seedPhrase`, `apiSecret`, `password`, `codes` respectively) - the same treatment the Password field already gets elsewhere in the app.

### 2.3 Not counted toward any plan limit

Per the user's decision, none of these five types count toward Free-plan limits (unlike Wallet items, which have `wallet_limit`). No changes needed to `get_account_usage()`, the plan-enforcement migration, or `PlanSettings.tsx`.

## 3. UI: One Generic Component, Not Five

Unlike the master-password-rotation feature's four re-encryption loops (which had real structural differences - three were text-based, one was file+R2-based, and the user explicitly chose to keep those separate), these five item types have **no meaningful structural difference** - each is: fetch rows filtered by `type`, decrypt, list, add/edit via a form with a few labeled fields, delete. Building five near-duplicate ~200-line components would be the kind of verbatim duplication a review would (rightly) flag as a defect, not a judgment call.

Instead: one `CredentialVault.tsx` component, configured per type:

```typescript
type CredentialFieldType = "text" | "password" | "textarea";

type CredentialFieldSchema = {
  key: string;           // JSON key inside encrypted_content
  label: string;
  type: CredentialFieldType;
  required: boolean;
  placeholder?: string;
};

type CredentialTypeConfig = {
  type: "ssh_key" | "crypto_wallet" | "api_credential" | "wifi_credential" | "two_factor_backup";
  label: string;          // "SSH Keys", "Crypto Passphrases", etc. - sidebar/header label
  icon: LucideIcon;
  primaryFieldKey: string; // which field is "the secret" - masked-by-default with reveal toggle
  fields: CredentialFieldSchema[];
};
```

`VaultApp.tsx` mounts five instances, one per type, each with its own `CredentialTypeConfig`:

```typescript
const SSH_KEY_CONFIG: CredentialTypeConfig = {
  type: "ssh_key",
  label: "SSH Keys",
  icon: TerminalIcon,
  primaryFieldKey: "privateKey",
  fields: [
    { key: "privateKey", label: "Private key", type: "textarea", required: true, placeholder: "-----BEGIN OPENSSH PRIVATE KEY-----" },
    { key: "publicKey", label: "Public key", type: "textarea", required: false, placeholder: "ssh-ed25519 AAAA..." },
    { key: "host", label: "Host", type: "text", required: false, placeholder: "e.g. github.com" },
    { key: "passphrase", label: "Passphrase", type: "password", required: false, placeholder: "If the key itself is passphrase-protected" },
    { key: "notes", label: "Notes", type: "textarea", required: false },
  ],
};
```

(Similarly for the other four - full field lists per section 2.2's table.)

Each `<CredentialVault config={...} masterPassword={...} />` instance independently: queries `secure_credentials` filtered by `.eq("type", config.type)`, renders its Add/Edit form fields by mapping over `config.fields` (so the form itself is generic, not five copy-pasted forms), and uses `config.primaryFieldKey` to know which field gets the masked/reveal treatment in the list and detail views.

This keeps the actual data-fetching, encryption, list rendering, and CRUD logic in one place, reviewed and tested once, while still giving each type its own distinct nav tab, icon, and label.

## 4. Integration Points

Every existing item type touches these five places; the new types need the same treatment:

1. **Sidebar nav** (`VaultApp.tsx`'s `NAV_SECTIONS`) - five new tabs, added to the existing "Vault" section (not a new section - keeps all vault item types together, consistent with how Wallet and Bank Accounts already sit alongside Passwords/Documents/Notes despite being a different table).
2. **Global search** (`GlobalSearch.tsx`) - one more `.from("secure_credentials").select("id, title, type").ilike("title", pattern)` query alongside the four existing per-table queries, mapped to five vault-type search results (one per `type` value).
3. **Dashboard** (`Dashboard.tsx`) - one more query added to the existing `Promise.all([...])` fetch, alongside `vault_items`/`vault_documents`/`secure_notes`/`secure_wallet`.
4. **Backup export/restore** (`vaultBackup.ts`/`vaultRestore.ts`) - `secure_credentials` added to the set of tables fetched, included in the backup JSON's `records`, and inserted back on restore - same shape as the existing four.

## 5. Critical Cross-Feature Integration: Master Password Rotation

This is the one integration point that isn't "add a query like the other four" - it's a correctness requirement inherited from a feature built earlier this session.

`rotate_master_key_ciphertexts` (the atomic Postgres function backing "Change master password") and its sole caller, `masterPasswordRotation.ts`, currently only know about four tables: `vault_items`, `secure_notes`, `secure_wallet`, `vault_documents`. If `secure_credentials` is added without updating this function, any SSH key / crypto passphrase / API credential / WiFi password / 2FA backup code would be **silently skipped** during a master password rotation - left encrypted with the OLD password forever, while everything else moves to the new one. Since the old password is discarded from memory once rotation completes, this would make those items **permanently undecryptable** - a real, severe correctness bug specific to this feature's interaction with the credential vault, not a hypothetical.

This must ship in the same round as the new table, not as a follow-up:
- A new migration replaces `rotate_master_key_ciphertexts` with a 5-table version (`drop function` for the old 4-parameter signature first, since Postgres treats a different parameter list as a distinct overload rather than a true replacement, then `create` the new 5-parameter version) - adding the same completeness-check-then-scoped-update-then-row-count-check pattern for `secure_credentials` that the existing four already have.
- `masterPasswordRotation.ts` gains a fifth fetch/decrypt/re-encrypt loop for `secure_credentials`, and its RPC call passes the new `p_credentials` payload alongside the existing four.
- The existing structural tests for both files get extended to cover the fifth table, following the exact same assertion patterns already used for the other four.

## 6. Non-Goals

- No new plan-limit enforcement (per user decision - unlimited on all plans).
- No new nav section/grouping beyond adding five tabs to the existing "Vault" section.
- No auto-detection of SSH key type (RSA/Ed25519/etc.) from key content - `host`/`passphrase` are freeform, optional fields, not validated against the actual key format.
- No TOTP/live 2FA code generation - "2FA Backup Codes" stores static one-time recovery codes as text, not a TOTP secret/generator.
- Admin console (`AdminOverview.tsx`, admin activity log, etc.) is not touched - it has no per-item-type breakdown for any existing vault type either, and adding one would be a privacy-relevant scope expansion nobody asked for.

## 7. Testing Considerations

- A test asserting `secure_credentials`' RLS policies exist and are scoped to `auth.uid()`, matching the pattern already used for `secure_wallet`.
- A test asserting `CredentialVault.tsx` renders its form fields by mapping over `config.fields` (generic), not hardcoding any one type's fields.
- A test asserting all five `CredentialTypeConfig` objects have a `primaryFieldKey` that actually matches one of their own `fields[].key` entries (a config typo here would silently break the mask/reveal toggle for that type).
- Tests extending the existing master-password-rotation structural tests to cover the fifth table/parameter, mirroring the existing four exactly.

## 8. Open Items For The Implementation Plan

- Exact migration ordering: the new `secure_credentials` table migration and the `rotate_master_key_ciphertexts` replacement could be one migration file or two sequential ones - the plan should decide based on whether the rotation function needs the table to already exist (it does, since it references it in the same transaction logic), meaning the table migration must run first.
- Exact field ordering/grouping within each type's Add/Edit form (the plan can follow the field order in section 2.2's table as the default).
- Icon choices given as recommendations here (`TerminalIcon`, `BitcoinIcon`, `KeySquareIcon`, `WifiIcon`, `ShieldEllipsisIcon`) should be confirmed available in the installed `lucide-react` version during planning.
