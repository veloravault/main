# Credential Vault Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five new encrypted vault item types (SSH Keys, Crypto Passphrases, API Credentials, WiFi Passwords, 2FA Backup Codes), sharing one new `secure_credentials` table and one generic `CredentialVault` component, fully wired into navigation, search, dashboard, backup/restore, and master password rotation.

**Architecture:** One Postgres table (`secure_credentials`) discriminated by a `type` column, mirroring the existing `secure_wallet` pattern. One generic React component (`CredentialVault.tsx`) configured per type via a `CredentialTypeConfig` object (icon, label, field schema, which field is "the secret"). Five config objects mounted as five sidebar tabs. Every place the four existing vault tables are already touched (global search, dashboard stats, backup export/restore, master password rotation) gets a fifth entry for `secure_credentials`.

**Tech Stack:** Next.js, TypeScript, Supabase (Postgres + RLS), Web Crypto (AES-256-GCM via existing `src/lib/crypto.ts`), Tailwind, lucide-react icons.

## Global Constraints

- Zero-knowledge: the server never sees plaintext or the master password. All encryption/decryption happens client-side via the existing `encryptText`/`decryptText` helpers in `src/lib/crypto.ts` - do not add any new crypto primitives.
- `secure_credentials` schema (exact column list, from the approved design spec): `id uuid`, `user_id uuid`, `title text not null`, `type text not null check (type in ('ssh_key', 'crypto_wallet', 'api_credential', 'wifi_credential', 'two_factor_backup'))`, `encrypted_content text not null`, `iv text not null`, `salt text not null`, `category text default 'Uncategorized'`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`.
- RLS policies on every vault table in this app (including `secure_wallet`, the closest precedent) require BOTH `(select auth.uid()) = user_id` AND active membership (`exists (select 1 from public.app_members member where member.user_id = (select auth.uid()) and member.status = 'active')`) - this is an invite-gated app, not just per-user ownership. `secure_credentials` policies must match this exactly.
- Every `SECURITY DEFINER` function in this codebase (see `rotate_master_key_ciphertexts`) uses `security definer`, `set search_path = ''`, then `revoke all on function ... from public, anon, authenticated;` followed by a scoped `grant execute ... to <role>;`.
- None of the five new types count toward any plan limit (Free/Plus) - do not touch `get_account_usage()`, plan-enforcement migrations, or `PlanSettings.tsx`.
- All five types are mounted as five separate `CredentialVault` instances, not five separate component files - the whole point of the shared-table design is one generic, config-driven component (see Task 3).
- The five new tabs must NOT be added to the mobile bottom tab bar (it already excludes `"banks"` for exactly this reason - too many icons for the space). They go into `MobileVaultMenu`'s "more actions" sheet instead, alongside Bank Accounts.
- Test suite constraint: `node --test tests/*.test.mjs` runs on plain Node with native TypeScript execution. It does NOT understand the `@/` tsconfig path alias. Any file using `@/` imports can only be tested by reading its source as text and asserting against it with regex (see the existing `tests/master-password-rotation.test.mjs` for the established style). A file with zero `@/` imports (only relative imports and real npm packages like `lucide-react`) CAN be imported and executed directly in a test.
- Master password rotation (`rotate_master_key_ciphertexts` + `masterPasswordRotation.ts`) MUST be extended to include `secure_credentials` in the same round as the table is added (Task 8) - otherwise any row in the new table is silently left encrypted under the OLD master password forever after a rotation, since the old password is discarded from memory once rotation completes. This is a correctness requirement, not an enhancement.

---

## Task 1: `secure_credentials` table migration

**Files:**
- Create: `supabase/migrations/20260723150000_secure_credentials.sql`
- Test: `tests/secure-credentials-schema.test.mjs`

**Interfaces:**
- Produces: table `public.secure_credentials` with columns `id, user_id, title, type, encrypted_content, iv, salt, category, created_at, updated_at`. Later tasks (3, 5, 6, 7, 8) read/write this table via the Supabase JS client and via the Task 8 SQL function.

- [ ] **Step 1: Write the failing test**

Create `tests/secure-credentials-schema.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync(new URL("../supabase/migrations/20260723150000_secure_credentials.sql", import.meta.url), "utf8");

test("secure_credentials table has the correct columns and type constraint", () => {
  assert.match(sql, /create table public\.secure_credentials/);
  assert.match(sql, /user_id uuid references auth\.users\(id\) on delete cascade not null/);
  assert.match(sql, /title text not null/);
  assert.match(
    sql,
    /type text not null check \(type in \('ssh_key', 'crypto_wallet', 'api_credential', 'wifi_credential', 'two_factor_backup'\)\)/,
  );
  assert.match(sql, /encrypted_content text not null/);
  assert.match(sql, /iv text not null/);
  assert.match(sql, /salt text not null/);
  assert.match(sql, /category text default 'Uncategorized'/);
});

test("secure_credentials has RLS enabled with all four policies scoped to owner + active membership", () => {
  assert.match(sql, /alter table public\.secure_credentials enable row level security/);

  const activeMembership = /exists\s*\(\s*select 1 from public\.app_members member\s+where member\.user_id = \(select auth\.uid\(\)\)\s+and member\.status = 'active'\s*\)/;

  for (const op of ["select", "insert", "update", "delete"]) {
    const re = new RegExp(`create policy "[^"]+"\\s+on public\\.secure_credentials for ${op} to authenticated`, "i");
    assert.match(sql, re, `expected a ${op} policy on secure_credentials`);
  }

  // Ownership + active membership required in every policy body.
  const ownershipCount = (sql.match(/\(select auth\.uid\(\)\)\s*=\s*user_id/g) ?? []).length;
  assert.ok(ownershipCount >= 4, "expected owner-scoping in at least 4 policy clauses (select/insert/using, update/using, update/with check, delete)");
  const membershipCount = (sql.match(activeMembership) ? (sql.match(new RegExp(activeMembership.source, "g")) ?? []).length : 0);
  assert.ok(membershipCount >= 4, "expected the active-membership check in at least 4 policy clauses");
});

test("secure_credentials API grants match the pattern used for the other vault tables", () => {
  assert.match(sql, /revoke all on table\s+public\.secure_credentials\s+from anon, authenticated;/);
  assert.match(sql, /grant select, insert, update, delete on table\s+public\.secure_credentials\s+to authenticated, service_role;/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/secure-credentials-schema.test.mjs`
Expected: FAIL (file `supabase/migrations/20260723150000_secure_credentials.sql` does not exist yet, `readFileSync` throws `ENOENT`).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260723150000_secure_credentials.sql`:

```sql
-- Five new vault item types (SSH keys, crypto passphrases, API credentials,
-- WiFi passwords, 2FA backup codes) share one table via a `type`
-- discriminator, mirroring the existing secure_wallet pattern
-- (credit_card/bank_account) - five near-identical "encrypted blob" shapes
-- don't warrant five separate tables, RLS policy sets, and backup/restore
-- integration points.

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

alter table public.secure_credentials enable row level security;

create policy "Users can view their own credentials"
on public.secure_credentials for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

create policy "Users can insert their own credentials"
on public.secure_credentials for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

create policy "Users can update their own credentials"
on public.secure_credentials for update to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

create policy "Users can delete their own credentials"
on public.secure_credentials for delete to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

-- Keep the table available through the Data API only to signed-in users and
-- trusted server code, matching vault_items/vault_documents/secure_notes/secure_wallet.
revoke all on table
  public.secure_credentials
from anon, authenticated;

grant select, insert, update, delete on table
  public.secure_credentials
to authenticated, service_role;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/secure-credentials-schema.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5: Push the migration**

Run: `supabase db push`
Expected: prompts to confirm, then applies `20260723150000_secure_credentials.sql`. If the CLI prompts `Do you want to push these migrations to the remote database? [Y/n]`, confirm with the user before answering.

- [ ] **Step 6: Verify live via an unauthenticated request**

Run something equivalent to:
```bash
curl -s "$SUPABASE_URL/rest/v1/secure_credentials?select=id&limit=1" -H "apikey: $SUPABASE_ANON_KEY"
```
Expected: a `401`/RLS-denial style JSON body (not a `relation does not exist` error) - confirms the table exists and is protected, mirroring the verification pattern used for every prior migration this session.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260723150000_secure_credentials.sql tests/secure-credentials-schema.test.mjs
git commit -m "feat: add secure_credentials table for SSH keys, crypto passphrases, API credentials, WiFi passwords, and 2FA backup codes"
```

---

## Task 2: `src/lib/credentialTypes.ts` - field schemas and configs

**Files:**
- Create: `src/lib/credentialTypes.ts`
- Test: `tests/credential-types.test.mjs`

**Interfaces:**
- Consumes: nothing project-specific (only the `lucide-react` npm package for icon component types - no `@/` imports, so this file can be imported directly by tests and by every later task).
- Produces:
  - `export type CredentialFieldType = "text" | "password" | "textarea";`
  - `export interface CredentialFieldSchema { key: string; label: string; type: CredentialFieldType; required: boolean; placeholder?: string; }`
  - `export type CredentialType = "ssh_key" | "crypto_wallet" | "api_credential" | "wifi_credential" | "two_factor_backup";`
  - `export interface CredentialTypeConfig { type: CredentialType; label: string; itemNoun: string; icon: LucideIcon; primaryFieldKey: string; fields: CredentialFieldSchema[]; }`
  - `export const SSH_KEY_CONFIG`, `CRYPTO_WALLET_CONFIG`, `API_CREDENTIAL_CONFIG`, `WIFI_CREDENTIAL_CONFIG`, `TWO_FACTOR_BACKUP_CONFIG: CredentialTypeConfig`
  - `export const CREDENTIAL_TYPE_CONFIGS: CredentialTypeConfig[]` (all five, in nav order) - Task 4 iterates this to register nav tabs/routes/mobile-menu rows instead of writing five near-identical blocks.

- [ ] **Step 1: Write the failing test**

Create `tests/credential-types.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CREDENTIAL_TYPE_CONFIGS,
  SSH_KEY_CONFIG,
  CRYPTO_WALLET_CONFIG,
  API_CREDENTIAL_CONFIG,
  WIFI_CREDENTIAL_CONFIG,
  TWO_FACTOR_BACKUP_CONFIG,
} from "../src/lib/credentialTypes.ts";

test("CREDENTIAL_TYPE_CONFIGS contains exactly the five approved types, in order", () => {
  assert.deepEqual(
    CREDENTIAL_TYPE_CONFIGS.map((config) => config.type),
    ["ssh_key", "crypto_wallet", "api_credential", "wifi_credential", "two_factor_backup"],
  );
  assert.equal(CREDENTIAL_TYPE_CONFIGS[0], SSH_KEY_CONFIG);
  assert.equal(CREDENTIAL_TYPE_CONFIGS[1], CRYPTO_WALLET_CONFIG);
  assert.equal(CREDENTIAL_TYPE_CONFIGS[2], API_CREDENTIAL_CONFIG);
  assert.equal(CREDENTIAL_TYPE_CONFIGS[3], WIFI_CREDENTIAL_CONFIG);
  assert.equal(CREDENTIAL_TYPE_CONFIGS[4], TWO_FACTOR_BACKUP_CONFIG);
});

test("every config's primaryFieldKey matches one of its own fields, and every field has a non-empty key/label", () => {
  for (const config of CREDENTIAL_TYPE_CONFIGS) {
    const keys = config.fields.map((field) => field.key);
    assert.ok(
      keys.includes(config.primaryFieldKey),
      `${config.type}: primaryFieldKey "${config.primaryFieldKey}" must match one of its fields' keys (${keys.join(", ")})`,
    );
    assert.ok(new Set(keys).size === keys.length, `${config.type}: field keys must be unique`);
    for (const field of config.fields) {
      assert.ok(field.key.length > 0, `${config.type}: every field needs a key`);
      assert.ok(field.label.length > 0, `${config.type}: every field needs a label`);
      assert.ok(["text", "password", "textarea"].includes(field.type), `${config.type}: field "${field.key}" has an invalid type "${field.type}"`);
    }
  }
});

test("every config has at least one required field, a non-empty label/itemNoun, and a valid icon component", () => {
  for (const config of CREDENTIAL_TYPE_CONFIGS) {
    assert.ok(config.fields.some((field) => field.required), `${config.type}: expected at least one required field`);
    assert.ok(config.label.length > 0, `${config.type}: label must not be empty`);
    assert.ok(config.itemNoun.length > 0, `${config.type}: itemNoun must not be empty`);
    assert.ok(config.icon, `${config.type}: icon must be set`);
  }
});

test("SSH key config matches the approved field set", () => {
  assert.deepEqual(SSH_KEY_CONFIG.fields.map((f) => f.key), ["privateKey", "publicKey", "host", "passphrase", "notes"]);
  assert.equal(SSH_KEY_CONFIG.primaryFieldKey, "privateKey");
});

test("crypto wallet config matches the approved field set", () => {
  assert.deepEqual(CRYPTO_WALLET_CONFIG.fields.map((f) => f.key), ["seedPhrase", "walletAddress", "notes"]);
  assert.equal(CRYPTO_WALLET_CONFIG.primaryFieldKey, "seedPhrase");
});

test("API credential config matches the approved field set", () => {
  assert.deepEqual(API_CREDENTIAL_CONFIG.fields.map((f) => f.key), ["serviceName", "apiKey", "apiSecret", "notes"]);
  assert.equal(API_CREDENTIAL_CONFIG.primaryFieldKey, "apiSecret");
});

test("WiFi credential config matches the approved field set", () => {
  assert.deepEqual(WIFI_CREDENTIAL_CONFIG.fields.map((f) => f.key), ["networkName", "password", "notes"]);
  assert.equal(WIFI_CREDENTIAL_CONFIG.primaryFieldKey, "password");
});

test("2FA backup config matches the approved field set", () => {
  assert.deepEqual(TWO_FACTOR_BACKUP_CONFIG.fields.map((f) => f.key), ["serviceName", "codes", "notes"]);
  assert.equal(TWO_FACTOR_BACKUP_CONFIG.primaryFieldKey, "codes");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/credential-types.test.mjs`
Expected: FAIL (`src/lib/credentialTypes.ts` does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/credentialTypes.ts`:

```typescript
import {
  TerminalIcon,
  BitcoinIcon,
  KeySquareIcon,
  WifiIcon,
  ShieldEllipsisIcon,
  type LucideIcon,
} from "lucide-react";

export type CredentialFieldType = "text" | "password" | "textarea";

export interface CredentialFieldSchema {
  key: string;
  label: string;
  type: CredentialFieldType;
  required: boolean;
  placeholder?: string;
}

export type CredentialType =
  | "ssh_key"
  | "crypto_wallet"
  | "api_credential"
  | "wifi_credential"
  | "two_factor_backup";

export interface CredentialTypeConfig {
  type: CredentialType;
  label: string;
  itemNoun: string;
  icon: LucideIcon;
  primaryFieldKey: string;
  fields: CredentialFieldSchema[];
}

export const SSH_KEY_CONFIG: CredentialTypeConfig = {
  type: "ssh_key",
  label: "SSH Keys",
  itemNoun: "SSH key",
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

export const CRYPTO_WALLET_CONFIG: CredentialTypeConfig = {
  type: "crypto_wallet",
  label: "Crypto Passphrases",
  itemNoun: "crypto passphrase",
  icon: BitcoinIcon,
  primaryFieldKey: "seedPhrase",
  fields: [
    { key: "seedPhrase", label: "Seed / recovery phrase", type: "textarea", required: true, placeholder: "word1 word2 word3 ..." },
    { key: "walletAddress", label: "Wallet address", type: "text", required: false, placeholder: "0x... or bc1..." },
    { key: "notes", label: "Notes", type: "textarea", required: false },
  ],
};

export const API_CREDENTIAL_CONFIG: CredentialTypeConfig = {
  type: "api_credential",
  label: "API Credentials",
  itemNoun: "API credential",
  icon: KeySquareIcon,
  primaryFieldKey: "apiSecret",
  fields: [
    { key: "serviceName", label: "Service name", type: "text", required: false, placeholder: "e.g. Stripe, AWS" },
    { key: "apiKey", label: "Key", type: "text", required: true, placeholder: "Public key / client ID" },
    { key: "apiSecret", label: "Secret", type: "password", required: false, placeholder: "Secret key / client secret" },
    { key: "notes", label: "Notes", type: "textarea", required: false },
  ],
};

export const WIFI_CREDENTIAL_CONFIG: CredentialTypeConfig = {
  type: "wifi_credential",
  label: "WiFi Passwords",
  itemNoun: "WiFi password",
  icon: WifiIcon,
  primaryFieldKey: "password",
  fields: [
    { key: "networkName", label: "Network name (SSID)", type: "text", required: true, placeholder: "e.g. Home-5G" },
    { key: "password", label: "Password", type: "password", required: true, placeholder: "Network password" },
    { key: "notes", label: "Notes", type: "textarea", required: false },
  ],
};

export const TWO_FACTOR_BACKUP_CONFIG: CredentialTypeConfig = {
  type: "two_factor_backup",
  label: "2FA Backup Codes",
  itemNoun: "2FA backup code set",
  icon: ShieldEllipsisIcon,
  primaryFieldKey: "codes",
  fields: [
    { key: "serviceName", label: "Service name", type: "text", required: false, placeholder: "e.g. GitHub, Google" },
    { key: "codes", label: "Backup codes", type: "textarea", required: true, placeholder: "One code per line" },
    { key: "notes", label: "Notes", type: "textarea", required: false },
  ],
};

export const CREDENTIAL_TYPE_CONFIGS: CredentialTypeConfig[] = [
  SSH_KEY_CONFIG,
  CRYPTO_WALLET_CONFIG,
  API_CREDENTIAL_CONFIG,
  WIFI_CREDENTIAL_CONFIG,
  TWO_FACTOR_BACKUP_CONFIG,
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/credential-types.test.mjs`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/credentialTypes.ts tests/credential-types.test.mjs
git commit -m "feat: add field schemas and configs for the five new credential vault types"
```

---

## Task 3: `CredentialVault.tsx` - the generic component

**Files:**
- Create: `src/components/CredentialVault.tsx`
- Test: `tests/credential-vault-component.test.mjs`

**Interfaces:**
- Consumes: `CredentialTypeConfig`, `CredentialFieldSchema` from `@/lib/credentialTypes` (Task 2); `encryptText`/`decryptText` from `@/lib/crypto`; `setCache`/`getCache`/`invalidateCache` from `@/lib/vaultCache`; `useOptimisticDelete` from `@/hooks/useOptimisticDelete`; `copySensitiveText` from `@/lib/secureClipboard`; `ContextActions` from `@/components/ui/context-actions`; `AdaptiveSheet`/`AdaptiveSheetBody`/`AdaptiveSheetFooter` from `@/components/ui/adaptive-sheet`; `CardListSkeleton` from `@/components/Skeleton`; `SelectionToolbar` from `@/components/SelectionToolbar`; `DropdownMenu*` from `@/components/ui/dropdown-menu`; `Button` from `@/components/ui/button`; `useToast` from `@/components/Toast`.
- Produces: `export function CredentialVault({ config, masterPassword, focusedItemId, refreshVersion }: { config: CredentialTypeConfig; masterPassword: string; focusedItemId?: string | null; refreshVersion?: number })`. Task 4 mounts one instance per config from `CREDENTIAL_TYPE_CONFIGS`, spreading the existing `refreshableProps = { masterPassword, focusedItemId, refreshVersion }` plus `config={config}`.
- Cache keys are namespaced per type as `` `secure_credentials:${config.type}` `` (NOT the bare table name) - five instances of this component are mounted simultaneously (VaultApp keeps all tabs mounted, hidden via `display: none`), all querying the same table, so a shared cache key would let one type's cached rows leak into another's list.

- [ ] **Step 1: Write the failing test**

Create `tests/credential-vault-component.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("CredentialVault is generic over config, not hardcoded to one type's fields", () => {
  const source = read("src/components/CredentialVault.tsx");

  assert.match(source, /export function CredentialVault\(\{ config, masterPassword, focusedItemId, refreshVersion/);
  assert.match(source, /import type \{ CredentialTypeConfig, CredentialFieldSchema \} from "@\/lib\/credentialTypes";/);

  // Fetches are filtered by this instance's own type - not every credential row.
  assert.match(source, /from\("secure_credentials"\)/);
  assert.match(source, /\.eq\("type", config\.type\)/);

  // Cache key is namespaced per type, not shared across the five mounted instances.
  assert.match(source, /`secure_credentials:\$\{config\.type\}`/);

  // Insert/update pass config.type and JSON.stringify a dynamic values object,
  // not any one type's named fields (e.g. no literal "privateKey"/"seedPhrase" in the component).
  assert.match(source, /type: config\.type/);
  assert.match(source, /JSON\.stringify\(/);
  assert.doesNotMatch(source, /privateKey|seedPhrase|apiSecret|networkName|walletAddress/);

  // Add/edit forms render fields by mapping over config.fields, not a fixed list.
  assert.match(source, /config\.fields\.map\(/);

  // Encrypt with masterPassword, decrypt with masterPassword (single-key model, unlike rotation).
  assert.match(source, /encryptText\(JSON\.stringify\([^)]*\),\s*masterPassword\)/);
  assert.match(source, /decryptText\([^)]*masterPassword\)/);
});

test("CredentialVault masks only the configured primary field in the detail view, with a reveal toggle", () => {
  const source = read("src/components/CredentialVault.tsx");
  assert.match(source, /field\.key === config\.primaryFieldKey/);
  assert.match(source, /isSecretRevealed/);
  assert.match(source, /EyeIcon/);
  assert.match(source, /EyeOffIcon/);
});

test("CredentialVault supports bulk selection and delete, matching the other vault components", () => {
  const source = read("src/components/CredentialVault.tsx");
  assert.match(source, /useOptimisticDelete/);
  assert.match(source, /SelectionToolbar/);
  assert.match(source, /\.delete\(\)\.in\("id", idsToDelete\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/credential-vault-component.test.mjs`
Expected: FAIL (`src/components/CredentialVault.tsx` does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/components/CredentialVault.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { encryptText, decryptText } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { CardListSkeleton } from "@/components/Skeleton";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import { AdaptiveSheet, AdaptiveSheetBody, AdaptiveSheetFooter } from "@/components/ui/adaptive-sheet";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PlusIcon,
  CheckSquareIcon,
  SquareIcon,
  TrashIcon,
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setCache, getCache, invalidateCache } from "@/lib/vaultCache";
import { useToast } from "@/components/Toast";
import { useOptimisticDelete } from "@/hooks/useOptimisticDelete";
import { copySensitiveText } from "@/lib/secureClipboard";
import { ContextActions } from "@/components/ui/context-actions";
import type { CredentialTypeConfig, CredentialFieldSchema } from "@/lib/credentialTypes";

interface SecureCredentialRow {
  id: string;
  title: string;
  encrypted_content: string;
  iv: string;
  salt: string;
}

interface DecryptedCredential {
  id: string;
  title: string;
  payload: Record<string, string>;
  decryptionFailed?: boolean;
}

function emptyValues(fields: CredentialFieldSchema[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.key, ""]));
}

function CredentialFormField({
  field,
  value,
  onChange,
  idPrefix,
}: {
  field: CredentialFieldSchema;
  value: string;
  onChange: (value: string) => void;
  idPrefix: string;
}) {
  const id = `${idPrefix}-${field.key}`;
  const optionalTag = !field.required ? <span className="text-muted-foreground/50 font-normal"> (optional)</span> : null;

  if (field.type === "textarea") {
    return (
      <div>
        <label htmlFor={id} className="account-field-label">{field.label}{optionalTag}</label>
        <textarea
          id={id}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="account-field-input is-large font-mono"
          required={field.required}
        />
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="account-field-label">{field.label}{optionalTag}</label>
      <input
        id={id}
        type={field.type === "password" ? "password" : "text"}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="account-field-input full-width"
        required={field.required}
      />
    </div>
  );
}

export function CredentialVault({
  config,
  masterPassword,
  focusedItemId,
  refreshVersion = 0,
}: {
  config: CredentialTypeConfig;
  masterPassword: string;
  focusedItemId?: string | null;
  refreshVersion?: number;
}) {
  const toast = useToast();
  const cacheKey = `secure_credentials:${config.type}`;
  const [items, setItems] = useState<DecryptedCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSecretRevealed, setIsSecretRevealed] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string>>(() => emptyValues(config.fields));
  const [addItemError, setAddItemError] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<DecryptedCredential | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [editItemError, setEditItemError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { scheduleDelete } = useOptimisticDelete({
    items,
    setItems,
    toastLabel: (item) => item.title || config.itemNoun,
    commitDelete: async (item) => {
      const { error } = await supabase.from("secure_credentials").delete().eq("id", item.id);
      if (error) throw error;
      invalidateCache(cacheKey);
    },
  });

  useEffect(() => {
    setIsSecretRevealed(false);
  }, [expandedId]);

  useEffect(() => {
    if (focusedItemId) {
      queueMicrotask(() => setExpandedId(focusedItemId));
      setTimeout(() => {
        const el = document.getElementById(`item-${focusedItemId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [focusedItemId]);

  const fetchItems = useCallback(async () => {
    const cached = getCache<DecryptedCredential>(cacheKey);
    if (cached) { setItems(cached); setLoading(false); return; }

    setLoading(true);
    const { data, error } = await supabase
      .from("secure_credentials")
      .select("id, title, encrypted_content, iv, salt")
      .eq("type", config.type)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn(`Error fetching ${config.type} credentials:`, error);
      setLoading(false);
      return;
    }

    const decryptedItems: DecryptedCredential[] = [];
    for (const item of (data as SecureCredentialRow[])) {
      try {
        const jsonStr = await decryptText(item.encrypted_content, item.salt, item.iv, masterPassword);
        decryptedItems.push({ id: item.id, title: item.title, payload: JSON.parse(jsonStr) as Record<string, string> });
      } catch (err: unknown) {
        console.warn(`Failed to decrypt ${config.type} item ${item.title}`, err);
        decryptedItems.push({ id: item.id, title: item.title, payload: {}, decryptionFailed: true });
      }
    }
    setItems(decryptedItems);
    setCache(cacheKey, decryptedItems);
    setLoading(false);
  }, [masterPassword, config.type, cacheKey]);

  useEffect(() => {
    queueMicrotask(() => { void fetchItems(); });
  }, [fetchItems]);

  useEffect(() => {
    if (!refreshVersion) return;
    invalidateCache(cacheKey);
    queueMicrotask(() => void fetchItems());
  }, [fetchItems, refreshVersion, cacheKey]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const missingRequired = config.fields.some((field) => field.required && !formValues[field.key]?.trim());
    if (!newTitle.trim() || missingRequired) {
      setAddItemError("Fill in every required field before saving.");
      return;
    }
    setAddItemError(null);

    try {
      const encrypted = await encryptText(JSON.stringify(formValues), masterPassword);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase.from("secure_credentials").insert({
        user_id: user.id,
        title: newTitle,
        type: config.type,
        encrypted_content: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
      });
      if (error) throw error;

      setNewTitle("");
      setFormValues(emptyValues(config.fields));
      setIsAddOpen(false);
      invalidateCache(cacheKey);
      fetchItems();
    } catch (err) {
      console.error(`Failed to add ${config.type} item:`, err);
      toast(err instanceof Error ? err.message : `Failed to save the ${config.itemNoun}. Please try again.`, "error");
    }
  };

  const openEditItem = (item: DecryptedCredential) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditValues(Object.fromEntries(config.fields.map((field) => [field.key, item.payload[field.key] ?? ""])));
    setEditItemError(null);
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const missingRequired = config.fields.some((field) => field.required && !editValues[field.key]?.trim());
    if (!editTitle.trim() || missingRequired) {
      setEditItemError("Fill in every required field before saving.");
      return;
    }
    setEditItemError(null);
    setIsSavingEdit(true);

    try {
      const encrypted = await encryptText(JSON.stringify(editValues), masterPassword);
      const { error } = await supabase.from("secure_credentials").update({
        title: editTitle,
        encrypted_content: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
      }).eq("id", editingItem.id);
      if (error) throw error;

      setEditingItem(null);
      invalidateCache(cacheKey);
      fetchItems();
      toast(`${config.itemNoun[0].toUpperCase()}${config.itemNoun.slice(1)} updated`, "success");
    } catch (err) {
      console.error(`Failed to update ${config.type} item:`, err);
      setEditItemError(err instanceof Error ? err.message : "Failed to save the changes.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) return;
    const idsToDelete = Array.from(selectedIds);
    const { error } = await supabase.from("secure_credentials").delete().in("id", idsToDelete);
    if (!error) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      invalidateCache(cacheKey);
      fetchItems();
    } else {
      toast("Failed to delete items", "error");
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    const { scheduled } = await copySensitiveText(text);
    toast(`${label} copied${scheduled ? " and scheduled to clear" : ""}`, "success");
  };

  const Icon = config.icon;

  return (
    <div className="apple-surface vault-material-scope w-full">
      <div className="vault-section-toolbar">
        <div className="vault-section-heading">
          <h2 className="type-section-title">{config.label}</h2>
          {isSelectionMode && (
            <span className="text-[13px] font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
              {selectedIds.size} selected
            </span>
          )}
        </div>

        <div className="vault-section-actions">
          {items.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger aria-label="More actions" className="vault-section-overflow rounded-full w-9 h-9 p-0 text-muted-foreground hover:bg-muted/80 flex items-center justify-center">
                <MoreHorizontalIcon className="w-5 h-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem
                  onClick={() => {
                    setIsSelectionMode((value) => !value);
                    if (isSelectionMode) setSelectedIds(new Set());
                  }}
                  className="font-medium cursor-pointer"
                >
                  {isSelectionMode ? "Cancel Editing" : "Select Items"}
                </DropdownMenuItem>
                {isSelectionMode && (
                  <DropdownMenuItem
                    onClick={() => {
                      if (selectedIds.size === items.length) setSelectedIds(new Set());
                      else setSelectedIds(new Set(items.map((item) => item.id)));
                    }}
                    className="font-medium cursor-pointer"
                  >
                    {selectedIds.size === items.length ? "Deselect All" : "Select All"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <button type="button" onClick={() => setIsAddOpen(true)} className="vault-section-primary-action rounded-full h-9 px-4 sm:px-5 font-semibold text-[14px] flex items-center gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 outline-none">
            <PlusIcon className="w-4 h-4" />
            <span className="hidden min-[380px]:inline">New</span>
          </button>

          <AdaptiveSheet open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) setAddItemError(null); }} title={`New ${config.itemNoun}`} description="Encrypted before it ever leaves this device." size="md" className="vault-create-sheet">
            <form onSubmit={handleAddItem} noValidate className="vault-create-form">
              <AdaptiveSheetBody className="space-y-4">
                <div>
                  <label htmlFor="new-credential-title" className="account-field-label">Title</label>
                  <input
                    id="new-credential-title"
                    type="text"
                    placeholder={`e.g. My ${config.itemNoun}`}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="account-field-input full-width"
                    required
                  />
                </div>
                {config.fields.map((field) => (
                  <CredentialFormField
                    key={field.key}
                    field={field}
                    value={formValues[field.key] ?? ""}
                    onChange={(value) => setFormValues((current) => ({ ...current, [field.key]: value }))}
                    idPrefix="new-credential"
                  />
                ))}
                {addItemError && <p className="text-[13px] text-destructive px-1" role="alert">{addItemError}</p>}
              </AdaptiveSheetBody>
              <AdaptiveSheetFooter><Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button><Button type="submit" className="import-primary-action">Save</Button></AdaptiveSheetFooter>
            </form>
          </AdaptiveSheet>

          <AdaptiveSheet open={!!editingItem} onOpenChange={(open) => { if (!open) { setEditingItem(null); setEditItemError(null); } }} title={`Edit ${config.itemNoun}`} description="Changes are re-encrypted with your existing master key." size="md" className="vault-create-sheet">
            <form onSubmit={handleEditItem} noValidate className="vault-create-form">
              <AdaptiveSheetBody className="space-y-4">
                <div>
                  <label htmlFor="edit-credential-title" className="account-field-label">Title</label>
                  <input
                    id="edit-credential-title"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="account-field-input full-width"
                    required
                  />
                </div>
                {config.fields.map((field) => (
                  <CredentialFormField
                    key={field.key}
                    field={field}
                    value={editValues[field.key] ?? ""}
                    onChange={(value) => setEditValues((current) => ({ ...current, [field.key]: value }))}
                    idPrefix="edit-credential"
                  />
                ))}
                {editItemError && <p className="text-[13px] text-destructive px-1" role="alert">{editItemError}</p>}
              </AdaptiveSheetBody>
              <AdaptiveSheetFooter><Button type="button" variant="ghost" onClick={() => setEditingItem(null)}>Cancel</Button><Button type="submit" disabled={isSavingEdit} className="import-primary-action">{isSavingEdit ? "Saving…" : "Save Changes"}</Button></AdaptiveSheetFooter>
            </form>
          </AdaptiveSheet>
        </div>
      </div>

      <div className="w-full">
        {loading ? (
          <CardListSkeleton count={4} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="w-16 h-16 flex items-center justify-center mb-4">
              <Icon className="w-12 h-12 text-muted-foreground/40" strokeWidth={1} />
            </div>
            <h3 className="text-[19px] font-semibold text-foreground mb-1.5 tracking-tight">No {config.label}</h3>
            <p className="text-[15px] text-muted-foreground max-w-[240px] leading-relaxed mb-6">Saved {config.label.toLowerCase()} will appear here.</p>
            <button type="button" onClick={() => setIsAddOpen(true)} className="text-[15px] font-semibold text-primary hover:opacity-75 transition-opacity">
              Add {config.itemNoun}
            </button>
          </div>
        ) : (
          <motion.div layout="position" className="flex flex-col gap-1 pb-12">
            <AnimatePresence initial={false}>
              {items.map((item) => {
                const isExpanded = expandedId === item.id;
                const isSelected = selectedIds.has(item.id);

                return (
                  <ContextActions key={item.id} title={item.title} actions={[
                    { id: "open", label: isExpanded ? "Close details" : "View details", onSelect: () => setExpandedId(isExpanded ? null : item.id) },
                    { id: "edit", label: "Edit", onSelect: () => openEditItem(item) },
                    { id: "delete", label: "Delete", destructive: true, onSelect: () => { if (expandedId === item.id) setExpandedId(null); scheduleDelete(item); } },
                  ]}>{(bindings) => (
                    <motion.div
                      {...bindings}
                      layout="position"
                      id={`item-${item.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`relative overflow-hidden rounded-[10px] group transition-colors ${!isExpanded ? "hover:bg-black/5 dark:hover:bg-white/5" : ""} ${isSelectionMode && isSelected ? "ring-2 ring-primary/30 bg-primary/5" : "bg-transparent"}`}
                    >
                      <button
                        onClick={(e) => isSelectionMode ? toggleSelection(item.id, e) : setExpandedId(isExpanded ? null : item.id)}
                        className="relative z-10 flex items-center justify-between p-4 sm:p-5 w-full focus:outline-none group bg-transparent"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          {isSelectionMode && (
                            <div className="shrink-0 text-primary">
                              {isSelected ? <CheckSquareIcon strokeWidth={2.5} className="w-5 h-5" /> : <SquareIcon strokeWidth={2} className="w-5 h-5 text-muted-foreground/50" />}
                            </div>
                          )}
                          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center shrink-0 border border-border">
                            <Icon strokeWidth={1.75} className="w-5 h-5 text-foreground/80" />
                          </div>
                          <span className={`text-[18px] font-semibold truncate tracking-tight ${isExpanded ? "text-primary" : "text-foreground"}`}>{item.title}</span>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? "bg-muted" : "group-hover:bg-muted"}`}>
                          {isExpanded ? <ChevronDownIcon strokeWidth={2.5} className="w-5 h-5 text-foreground" /> : <ChevronRightIcon strokeWidth={2.5} className="w-5 h-5 text-muted-foreground" />}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="relative z-10 px-5 pb-5 pt-4 border-t border-border">
                              {item.decryptionFailed ? (
                                <p className="text-[14px] text-destructive">This item could not be decrypted with your current master key.</p>
                              ) : (
                                config.fields.map((field) => {
                                  const rawValue = item.payload[field.key] ?? "";
                                  if (!rawValue) return null;
                                  const isPrimary = field.key === config.primaryFieldKey;
                                  const displayValue = isPrimary && !isSecretRevealed ? "••••••••••••" : rawValue;
                                  return (
                                    <div key={field.key} className="mb-4">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">{field.label}</span>
                                        <div className="flex items-center gap-1">
                                          {isPrimary && (
                                            <button type="button" onClick={() => setIsSecretRevealed((v) => !v)} className="p-1 text-muted-foreground/60 hover:text-primary transition-colors" aria-label={isSecretRevealed ? "Hide" : "Show"}>
                                              {isSecretRevealed ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                            </button>
                                          )}
                                          <button type="button" onClick={() => copyToClipboard(rawValue, field.label)} className="p-1 text-muted-foreground/60 hover:text-primary transition-colors" aria-label={`Copy ${field.label}`}>
                                            <CopyIcon className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="w-full bg-muted rounded-xl px-4 py-3 text-[15px] text-foreground tracking-wide break-words whitespace-pre-wrap border border-transparent font-mono">
                                        {displayValue}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                              <div className="flex flex-row gap-3 mt-2">
                                <button
                                  onClick={() => openEditItem(item)}
                                  className="flex-1 py-3 px-4 rounded-xl text-[15px] font-semibold text-foreground bg-secondary hover:bg-secondary/80 active:scale-[0.98] transition-all"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => { if (expandedId === item.id) setExpandedId(null); scheduleDelete(item); }}
                                  className="py-3 px-6 rounded-xl text-[15px] font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 active:scale-[0.98] transition-all"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}</ContextActions>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {isSelectionMode && (
        <SelectionToolbar count={selectedIds.size} onCancel={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} onDelete={handleBulkDelete} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/credential-vault-component.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from `src/components/CredentialVault.tsx` (it isn't wired into `VaultApp.tsx` yet, so this only checks the file compiles standalone against its own imports).

- [ ] **Step 6: Commit**

```bash
git add src/components/CredentialVault.tsx tests/credential-vault-component.test.mjs
git commit -m "feat: add generic CredentialVault component for the five new credential types"
```

---

## Task 4: Wire into `VaultApp.tsx` and `MobileVaultMenu.tsx`

**Files:**
- Modify: `src/components/VaultApp.tsx`
- Modify: `src/components/MobileVaultMenu.tsx`
- Test: `tests/credential-vault-navigation.test.mjs`

**Interfaces:**
- Consumes: `CredentialVault` (Task 3), `CREDENTIAL_TYPE_CONFIGS`, `CredentialType` (Task 2).
- Produces: `Tab` type extended with the five `CredentialType` values; five new sidebar nav items in the existing "Vault" `NAV_SECTIONS` group; five new routed `<CredentialVault>` instances; five new rows in `MobileVaultMenu`'s "more actions" sheet (not the mobile bottom tab bar).

- [ ] **Step 1: Write the failing test**

Create `tests/credential-vault-navigation.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("VaultApp registers the five credential tabs in the Vault nav section and mounts CredentialVault", () => {
  const source = read("src/components/VaultApp.tsx");

  assert.match(source, /import \{ CredentialVault \} from "@\/components\/CredentialVault";/);
  assert.match(source, /import \{ CREDENTIAL_TYPE_CONFIGS, type CredentialType \} from "@\/lib\/credentialTypes";/);

  // Tab type includes the credential types via the shared union, not five hand-written literals.
  assert.match(source, /type Tab = "dashboard" \| "passwords" \| "documents" \| "notes" \| "wallet" \| "banks" \| CredentialType \| "profile";/);

  // Nav registration and route mounting both iterate CREDENTIAL_TYPE_CONFIGS - not five copy-pasted blocks.
  assert.match(source, /\.\.\.CREDENTIAL_TYPE_CONFIGS\.map\(/);
  assert.match(source, /<CredentialVault config=\{config\}/);

  // Mobile bottom tab bar excludes the five credential tabs (and banks), same reasoning as the existing banks exclusion.
  assert.match(source, /MOBILE_TAB_BAR_EXCLUDED/);
  assert.match(source, /filter\(item => !MOBILE_TAB_BAR_EXCLUDED\.includes\(item\.tab\)\)/);

  // MobileVaultMenu receives a generic credential-navigation callback.
  assert.match(source, /onNavigateCredential=\{\(type\) => handleNavigate\(type\)\}/);
});

test("MobileVaultMenu lists all five credential types in its more-actions sheet", () => {
  const source = read("src/components/MobileVaultMenu.tsx");
  assert.match(source, /import \{ CREDENTIAL_TYPE_CONFIGS, type CredentialType \} from "@\/lib\/credentialTypes";/);
  assert.match(source, /onNavigateCredential: \(type: CredentialType\) => void;/);
  assert.match(source, /CREDENTIAL_TYPE_CONFIGS\.map\(\(config\) =>/);
  assert.match(source, /onClick=\{\(\) => act\(\(\) => props\.onNavigateCredential\(config\.type\)\)\}/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/credential-vault-navigation.test.mjs`
Expected: FAIL (none of the new imports/registrations exist yet).

- [ ] **Step 3: Update `VaultApp.tsx`**

In the import block, after `import { BankVault } from "@/components/BankVault";`, add:

```typescript
import { CredentialVault } from "@/components/CredentialVault";
import { CREDENTIAL_TYPE_CONFIGS, type CredentialType } from "@/lib/credentialTypes";
```

Change the `Tab` type:

```typescript
type Tab = "dashboard" | "passwords" | "documents" | "notes" | "wallet" | "banks" | CredentialType | "profile";
```

Change `NAV_SECTIONS`'s "Vault" section to append the five configs:

```typescript
const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { tab: "dashboard" as Tab, icon: LayoutDashboardIcon, label: "Dashboard" },
    ],
  },
  {
    label: "Vault",
    items: [
      { tab: "passwords" as Tab, icon: KeyRoundIcon,    label: "Passwords"  },
      { tab: "documents" as Tab, icon: FileTextIcon,    label: "Documents"  },
      { tab: "notes"     as Tab, icon: FileIcon,        label: "Notes"      },
      { tab: "wallet"    as Tab, icon: CreditCardIcon,  label: "Wallet"     },
      { tab: "banks"     as Tab, icon: BuildingIcon,    label: "Bank Accounts" },
      ...CREDENTIAL_TYPE_CONFIGS.map((config) => ({ tab: config.type as Tab, icon: config.icon, label: config.label })),
    ],
  },
];
```

Add a new constant right after `NAV_SECTIONS` (before `ALL_TABS_WITH_PROFILE`):

```typescript
// Mobile bottom tab bar has room for a handful of icons - Bank Accounts was
// already excluded and moved into the "more actions" sheet for the same
// reason; the five credential tabs join it there instead of the tab bar.
const MOBILE_TAB_BAR_EXCLUDED: Tab[] = ["banks", ...CREDENTIAL_TYPE_CONFIGS.map((config) => config.type as Tab)];
```

In the routes section, replace:

```tsx
            <div style={{ display: activeTab === "banks"     ? undefined : "none" }}><BankVault {...refreshableProps} /></div>
```

with:

```tsx
            <div style={{ display: activeTab === "banks"     ? undefined : "none" }}><BankVault {...refreshableProps} /></div>
            {CREDENTIAL_TYPE_CONFIGS.map((config) => (
              <div key={config.type} style={{ display: activeTab === config.type ? undefined : "none" }}>
                <CredentialVault config={config} {...refreshableProps} />
              </div>
            ))}
```

In the mobile bottom tab bar, replace:

```tsx
          {NAV_SECTIONS.flatMap(s => s.items).filter(item => item.tab !== "banks").map(({ tab, icon: Icon, label }) => {
```

with:

```tsx
          {NAV_SECTIONS.flatMap(s => s.items).filter(item => !MOBILE_TAB_BAR_EXCLUDED.includes(item.tab)).map(({ tab, icon: Icon, label }) => {
```

Update the `MobileVaultMenu` call site, replacing:

```tsx
            <div className="md:hidden"><MobileVaultMenu theme={theme} setTheme={setTheme} onNavigateBanks={() => handleNavigate("banks")} onNavigateSettings={() => handleNavigate("profile")} onMagicImport={() => setIsGlobalImportOpen(true)} onLock={handleLockVault} /></div>
```

with:

```tsx
            <div className="md:hidden"><MobileVaultMenu theme={theme} setTheme={setTheme} onNavigateBanks={() => handleNavigate("banks")} onNavigateCredential={(type) => handleNavigate(type)} onNavigateSettings={() => handleNavigate("profile")} onMagicImport={() => setIsGlobalImportOpen(true)} onLock={handleLockVault} /></div>
```

- [ ] **Step 4: Update `MobileVaultMenu.tsx`**

Replace the full file with:

```tsx
"use client";

import { useState } from "react";
import { BuildingIcon, CheckIcon, ChevronRightIcon, LockIcon, MoreHorizontalIcon, PaletteIcon, SettingsIcon, Wand2Icon } from "lucide-react";
import { AdaptiveSheet, AdaptiveSheetBody } from "@/components/ui/adaptive-sheet";
import type { Theme } from "@/components/ThemeProvider";
import { CREDENTIAL_TYPE_CONFIGS, type CredentialType } from "@/lib/credentialTypes";

type ThemeChoice = Theme;

export function MobileVaultMenu(props: {
  theme: Theme | undefined;
  setTheme: (theme: Theme) => void;
  onNavigateBanks: () => void;
  onNavigateCredential: (type: CredentialType) => void;
  onNavigateSettings: () => void;
  onMagicImport: () => void;
  onLock: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const activeTheme = (["system", "light", "dark"] as string[]).includes(props.theme ?? "") ? props.theme as ThemeChoice : "system";

  const act = (callback: () => void) => {
    setOpen(false);
    window.setTimeout(callback, 120);
  };

  return (
    <>
      <button type="button" className="vault-header-icon vault-header-more" aria-label="More actions" aria-haspopup="dialog" onClick={() => setOpen(true)}><MoreHorizontalIcon aria-hidden="true" /></button>
      <AdaptiveSheet open={open} onOpenChange={setOpen} title="Vault actions" description="Navigate and control this device." size="sm" className="mobile-vault-menu">
        <AdaptiveSheetBody className="mobile-vault-menu-body">
          <MenuRow icon={BuildingIcon} label="Bank Accounts" detail="Routing and account details" onClick={() => act(props.onNavigateBanks)} />
          {CREDENTIAL_TYPE_CONFIGS.map((config) => (
            <MenuRow key={config.type} icon={config.icon} label={config.label} detail={`Manage your ${config.label.toLowerCase()}`} onClick={() => act(() => props.onNavigateCredential(config.type))} />
          ))}
          <MenuRow icon={SettingsIcon} label="Profile & Settings" detail="Account, security and backup" onClick={() => act(props.onNavigateSettings)} />
          <MenuRow icon={Wand2Icon} label="Magic Import" detail="Review data before saving" onClick={() => act(props.onMagicImport)} />
          <MenuRow icon={PaletteIcon} label="Appearance" detail={activeTheme[0].toUpperCase() + activeTheme.slice(1)} onClick={() => { setOpen(false); window.setTimeout(() => setAppearanceOpen(true), 120); }} />
          <div className="mobile-vault-menu-separator" />
          <MenuRow icon={LockIcon} label="Lock Vault" detail="Keep your account signed in" destructive onClick={() => act(props.onLock)} />
        </AdaptiveSheetBody>
      </AdaptiveSheet>
      <AdaptiveSheet open={appearanceOpen} onOpenChange={setAppearanceOpen} title="Appearance" description="Choose how Velora Vault looks on this device." size="sm" className="mobile-vault-menu">
        <AdaptiveSheetBody className="mobile-vault-menu-body">
          {(["system", "light", "dark"] as ThemeChoice[]).map((choice) => <button key={choice} type="button" className="mobile-vault-theme-row system-interactive" onClick={() => { props.setTheme(choice); setAppearanceOpen(false); }}><span>{choice[0].toUpperCase() + choice.slice(1)}</span>{activeTheme === choice && <CheckIcon aria-hidden="true" />}</button>)}
        </AdaptiveSheetBody>
      </AdaptiveSheet>
    </>
  );
}

function MenuRow(props: { icon: typeof BuildingIcon; label: string; detail: string; destructive?: boolean; onClick: () => void }) {
  const Icon = props.icon;
  return <button type="button" className={`mobile-vault-menu-row system-interactive ${props.destructive ? "is-destructive" : ""}`} onClick={props.onClick}><span><Icon aria-hidden="true" /></span><span><strong>{props.label}</strong><small>{props.detail}</small></span><ChevronRightIcon aria-hidden="true" /></button>;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/credential-vault-navigation.test.mjs`
Expected: PASS (2 tests)

- [ ] **Step 6: Type-check and build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build` (or the project's equivalent `next build` script)
Expected: clean build, exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/VaultApp.tsx src/components/MobileVaultMenu.tsx tests/credential-vault-navigation.test.mjs
git commit -m "feat: wire the five credential vault types into sidebar nav, routes, and the mobile more-actions menu"
```

---

## Task 5: `GlobalSearch.tsx` - search across the five new types

**Files:**
- Modify: `src/components/GlobalSearch.tsx`
- Test: `tests/credential-vault-search.test.mjs`

**Interfaces:**
- Consumes: nothing new from earlier tasks beyond the `secure_credentials` table (Task 1) and its `type` values (Task 2).
- Produces: `SearchResult["vault"]` extended to include the five credential type strings; `VAULT_META` extended with an entry per type; one more query in `search()`.

- [ ] **Step 1: Write the failing test**

Create `tests/credential-vault-search.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../src/components/GlobalSearch.tsx", import.meta.url), "utf8");

test("GlobalSearch queries secure_credentials and maps each row to its own type-specific result", () => {
  assert.match(source, /vault: "passwords" \| "documents" \| "notes" \| "wallet" \| "banks" \| "ssh_key" \| "crypto_wallet" \| "api_credential" \| "wifi_credential" \| "two_factor_backup";/);

  for (const type of ["ssh_key", "crypto_wallet", "api_credential", "wifi_credential", "two_factor_backup"]) {
    assert.match(source, new RegExp(`${type}:\\s*\\{[^}]*icon:[^}]*label:[^}]*color:[^}]*bg:`), `expected a VAULT_META entry for "${type}"`);
  }

  assert.match(source, /supabase\.from\("secure_credentials"\)\.select\("id, title, type"\)\.ilike\("title", pattern\)\.limit\(5\)/);
  assert.match(source, /vault: r\.type as SearchResult\["vault"\]/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/credential-vault-search.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Update `GlobalSearch.tsx`**

Replace the imports and `SearchResult`/`VAULT_META` block:

```tsx
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import {
  SearchIcon,
  KeyRoundIcon,
  FileTextIcon,
  FileIcon,
  CreditCardIcon,
  BuildingIcon,
  XIcon,
  TerminalIcon,
  BitcoinIcon,
  KeySquareIcon,
  WifiIcon,
  ShieldEllipsisIcon,
} from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  vault: "passwords" | "documents" | "notes" | "wallet" | "banks" | "ssh_key" | "crypto_wallet" | "api_credential" | "wifi_credential" | "two_factor_backup";
}

const VAULT_META = {
  passwords:  { icon: KeyRoundIcon,     label: "Password",   color: "text-blue-500",   bg: "bg-blue-500/10" },
  documents:  { icon: FileTextIcon,     label: "Document",   color: "text-purple-500", bg: "bg-purple-500/10" },
  notes:      { icon: FileIcon,         label: "Note",       color: "text-amber-500",  bg: "bg-amber-500/10" },
  wallet:     { icon: CreditCardIcon,   label: "Wallet",     color: "text-emerald-500",bg: "bg-emerald-500/10" },
  banks:      { icon: BuildingIcon,     label: "Bank",       color: "text-indigo-500", bg: "bg-indigo-500/10" },
  ssh_key:           { icon: TerminalIcon,       label: "SSH Key",       color: "text-slate-500", bg: "bg-slate-500/10" },
  crypto_wallet:     { icon: BitcoinIcon,        label: "Crypto",        color: "text-orange-500", bg: "bg-orange-500/10" },
  api_credential:    { icon: KeySquareIcon,      label: "API Credential", color: "text-cyan-500", bg: "bg-cyan-500/10" },
  wifi_credential:   { icon: WifiIcon,           label: "WiFi",          color: "text-teal-500", bg: "bg-teal-500/10" },
  two_factor_backup: { icon: ShieldEllipsisIcon, label: "2FA Backup",    color: "text-rose-500", bg: "bg-rose-500/10" },
};
```

Inside `search()`, replace:

```tsx
    const pattern = `%${q}%`;
    const [passRes, docRes, noteRes, walletRes] = await Promise.all([
      supabase.from("vault_items").select("id, title, category").ilike("title", pattern).limit(5),
      supabase.from("vault_documents").select("id, title").ilike("title", pattern).limit(5),
      supabase.from("secure_notes").select("id, title").ilike("title", pattern).limit(5),
      supabase.from("secure_wallet").select("id, title, type").ilike("title", pattern).limit(5),
    ]);

    const combined: SearchResult[] = [
      ...(passRes.data || []).map(r => ({ id: r.id, title: r.title, subtitle: r.category, vault: "passwords" as const })),
      ...(docRes.data  || []).map(r => ({ id: r.id, title: r.title, vault: "documents" as const })),
      ...(noteRes.data || []).map(r => ({ id: r.id, title: r.title, vault: "notes" as const })),
      ...(walletRes.data || []).filter(r => r.type !== "bank_account").map(r => ({ id: r.id, title: r.title, subtitle: r.type?.replace("_", " "), vault: "wallet" as const })),
      ...(walletRes.data || []).filter(r => r.type === "bank_account").map(r => ({ id: r.id, title: r.title, subtitle: "Bank Account", vault: "banks" as const })),
    ];
```

with:

```tsx
    const pattern = `%${q}%`;
    const [passRes, docRes, noteRes, walletRes, credRes] = await Promise.all([
      supabase.from("vault_items").select("id, title, category").ilike("title", pattern).limit(5),
      supabase.from("vault_documents").select("id, title").ilike("title", pattern).limit(5),
      supabase.from("secure_notes").select("id, title").ilike("title", pattern).limit(5),
      supabase.from("secure_wallet").select("id, title, type").ilike("title", pattern).limit(5),
      supabase.from("secure_credentials").select("id, title, type").ilike("title", pattern).limit(5),
    ]);

    const combined: SearchResult[] = [
      ...(passRes.data || []).map(r => ({ id: r.id, title: r.title, subtitle: r.category, vault: "passwords" as const })),
      ...(docRes.data  || []).map(r => ({ id: r.id, title: r.title, vault: "documents" as const })),
      ...(noteRes.data || []).map(r => ({ id: r.id, title: r.title, vault: "notes" as const })),
      ...(walletRes.data || []).filter(r => r.type !== "bank_account").map(r => ({ id: r.id, title: r.title, subtitle: r.type?.replace("_", " "), vault: "wallet" as const })),
      ...(walletRes.data || []).filter(r => r.type === "bank_account").map(r => ({ id: r.id, title: r.title, subtitle: "Bank Account", vault: "banks" as const })),
      ...(credRes.data || []).map(r => ({ id: r.id, title: r.title, vault: r.type as SearchResult["vault"] })),
    ];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/credential-vault-search.test.mjs`
Expected: PASS

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/GlobalSearch.tsx tests/credential-vault-search.test.mjs
git commit -m "feat: include the five new credential types in global search"
```

---

## Task 6: `Dashboard.tsx` - credentials count

**Files:**
- Modify: `src/components/Dashboard.tsx`
- Test: `tests/credential-vault-dashboard.test.mjs`

**Interfaces:**
- Consumes: `secure_credentials` table (Task 1).
- Produces: `stats.credentials: number` (total row count across all five types combined, mirroring how the existing `stats.wallet` already blends `credit_card` + `bank_account` into one count); one more stats-grid row; the empty-vault check extended so a vault containing only credential items doesn't show "Your vault is empty".

- [ ] **Step 1: Write the failing test**

Create `tests/credential-vault-dashboard.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../src/components/Dashboard.tsx", import.meta.url), "utf8");

test("Dashboard fetches and displays a combined credentials count", () => {
  assert.match(source, /from\("secure_credentials"\)/);
  assert.match(source, /credentials:\s*0/);
  assert.match(source, /credentials:\s*credentialsList\.length/);
  assert.match(source, /label:\s*"Credentials"/);
});

test("the empty-vault check also accounts for credentials, so a credentials-only vault isn't shown as empty", () => {
  assert.match(source, /stats\.passwords === 0 && stats\.documents === 0 && stats\.notes === 0 && stats\.wallet === 0 && stats\.credentials === 0/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/credential-vault-dashboard.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Update `Dashboard.tsx`**

Add `KeySquareIcon` to the existing lucide-react import block (after `SparklesIcon,`):

```typescript
  SparklesIcon,
  KeySquareIcon,
```

Change the `stats` state initializer:

```typescript
  const [stats, setStats] = useState({
    passwords: 0,
    documents: 0,
    notes: 0,
    wallet: 0,
    credentials: 0,
  });
```

In `fetchDashboardData`, replace:

```tsx
      const [passData, docData, notesData, walletData] = await Promise.all([
        cachedPasswords ? Promise.resolve({ data: null }) : supabase.from("vault_items").select("*").order("created_at", { ascending: false }),
        supabase.from("vault_documents").select("id, title, created_at").order("created_at", { ascending: false }),
        supabase.from("secure_notes").select("id, title, created_at").order("created_at", { ascending: false }),
        supabase.from("secure_wallet").select("*").order("created_at", { ascending: false })
      ]);
```

with:

```tsx
      const [passData, docData, notesData, walletData, credentialsData] = await Promise.all([
        cachedPasswords ? Promise.resolve({ data: null }) : supabase.from("vault_items").select("*").order("created_at", { ascending: false }),
        supabase.from("vault_documents").select("id, title, created_at").order("created_at", { ascending: false }),
        supabase.from("secure_notes").select("id, title, created_at").order("created_at", { ascending: false }),
        supabase.from("secure_wallet").select("*").order("created_at", { ascending: false }),
        supabase.from("secure_credentials").select("id")
      ]);
```

Replace:

```tsx
      const docList = (docData.data || []) as DashboardDocument[];
      const notesList = (notesData.data || []) as DashboardNote[];
      const walletList = (walletData.data || []) as DashboardWalletRow[];

      setStats({
        passwords: passList.length,
        documents: docList.length,
        notes: notesList.length,
        wallet: walletList.length
      });
```

with:

```tsx
      const docList = (docData.data || []) as DashboardDocument[];
      const notesList = (notesData.data || []) as DashboardNote[];
      const walletList = (walletData.data || []) as DashboardWalletRow[];
      const credentialsList = (credentialsData.data || []) as { id: string }[];

      setStats({
        passwords: passList.length,
        documents: docList.length,
        notes: notesList.length,
        wallet: walletList.length,
        credentials: credentialsList.length
      });
```

Replace the empty-vault check condition:

```tsx
      {stats.passwords === 0 && stats.documents === 0 && stats.notes === 0 && stats.wallet === 0 && (
```

with:

```tsx
      {stats.passwords === 0 && stats.documents === 0 && stats.notes === 0 && stats.wallet === 0 && stats.credentials === 0 && (
```

Add one more row to the stats grid array, replacing:

```tsx
        {[
          { label: "Passwords",  value: stats.passwords,  icon: KeyRoundIcon  },
          { label: "Documents",  value: stats.documents,  icon: FileTextIcon  },
          { label: "Notes",      value: stats.notes,      icon: FileIcon      },
          { label: "Wallet",     value: stats.wallet,     icon: CreditCardIcon },
        ].map(({ label, value, icon: Icon }, i, arr) => (
```

with:

```tsx
        {[
          { label: "Passwords",  value: stats.passwords,  icon: KeyRoundIcon  },
          { label: "Documents",  value: stats.documents,  icon: FileTextIcon  },
          { label: "Notes",      value: stats.notes,      icon: FileIcon      },
          { label: "Wallet",     value: stats.wallet,     icon: CreditCardIcon },
          { label: "Credentials", value: stats.credentials, icon: KeySquareIcon },
        ].map(({ label, value, icon: Icon }, i, arr) => (
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/credential-vault-dashboard.test.mjs`
Expected: PASS (2 tests)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/Dashboard.tsx tests/credential-vault-dashboard.test.mjs
git commit -m "feat: show a combined credentials count on the dashboard"
```

---

## Task 7: Backup export/restore - `vaultBackup.ts`, `vaultRestore.ts`, `BackupSettings.tsx`

**Files:**
- Modify: `src/lib/vaultBackup.ts`
- Modify: `src/lib/vaultRestore.ts`
- Modify: `src/components/settings/BackupSettings.tsx`
- Test: `tests/credential-vault-backup-restore.test.mjs`

**Interfaces:**
- Consumes: `secure_credentials` table (Task 1).
- Produces: `BackupManifest.counts` and `RestoreResult.restored` both gain a `credentials` field; `records.secure_credentials` is included in every exported backup and re-inserted on restore; `RestoreProgress.stage` gains `"credentials"`; `BackupSettings.tsx`'s `RECORD_LABELS`, its pre-restore summary sentence, its post-restore summary sentence, and its cache-invalidation list are all updated to include credentials.

- [ ] **Step 1: Write the failing test**

Create `tests/credential-vault-backup-restore.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("vaultBackup exports secure_credentials alongside the other four tables", () => {
  const source = read("src/lib/vaultBackup.ts");
  assert.match(source, /counts: Record<"passwords" \| "documents" \| "notes" \| "wallet" \| "credentials", number>;/);
  assert.match(source, /supabase\.from\("secure_credentials"\)\.select\("\*"\)/);
  assert.match(source, /secure_credentials: credentials\.data \?\? \[\]/);
  assert.match(source, /credentials: records\.secure_credentials\.length/);
});

test("vaultRestore re-inserts secure_credentials rows under the current user, with its own progress stage", () => {
  const source = read("src/lib/vaultRestore.ts");
  assert.match(source, /stage: "documents" \| "passwords" \| "notes" \| "wallet" \| "credentials";/);
  assert.match(source, /restored: \{ passwords: number; documents: number; notes: number; wallet: number; credentials: number \};/);
  assert.match(source, /backup\.records\.secure_credentials \?\? \[\]/);
  assert.match(source, /supabase\.from\("secure_credentials"\)\.insert\(\{/);
  assert.match(source, /type: row\.type,/);
  assert.match(source, /restored\.credentials \+= 1/);
});

test("BackupSettings labels the credentials stage and includes it in both summary sentences and cache invalidation", () => {
  const source = read("src/components/settings/BackupSettings.tsx");
  assert.match(source, /credentials: "Credentials",/);
  assert.match(source, /parsedBackup\.manifest\.counts\.credentials/);
  assert.match(source, /restoreResult\.restored\.credentials/);
  for (const type of ["ssh_key", "crypto_wallet", "api_credential", "wifi_credential", "two_factor_backup"]) {
    assert.match(source, new RegExp(`secure_credentials:${type}`));
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/credential-vault-backup-restore.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Update `vaultBackup.ts`**

Replace:

```typescript
  counts: Record<"passwords" | "documents" | "notes" | "wallet", number>;
```

with:

```typescript
  counts: Record<"passwords" | "documents" | "notes" | "wallet" | "credentials", number>;
```

Replace:

```typescript
  const [passwords, documents, notes, wallet] = await Promise.all([
    supabase.from("vault_items").select("*"),
    supabase.from("vault_documents").select("*"),
    supabase.from("secure_notes").select("*"),
    supabase.from("secure_wallet").select("*"),
  ]);
  const queryError = passwords.error ?? documents.error ?? notes.error ?? wallet.error;
  if (queryError) throw new BackupExportError(queryError.message);
```

with:

```typescript
  const [passwords, documents, notes, wallet, credentials] = await Promise.all([
    supabase.from("vault_items").select("*"),
    supabase.from("vault_documents").select("*"),
    supabase.from("secure_notes").select("*"),
    supabase.from("secure_wallet").select("*"),
    supabase.from("secure_credentials").select("*"),
  ]);
  const queryError = passwords.error ?? documents.error ?? notes.error ?? wallet.error ?? credentials.error;
  if (queryError) throw new BackupExportError(queryError.message);
```

Replace:

```typescript
  const records = {
    vault_items: passwords.data ?? [],
    vault_documents: documents.data ?? [],
    secure_notes: notes.data ?? [],
    secure_wallet: wallet.data ?? [],
  };
```

with:

```typescript
  const records = {
    vault_items: passwords.data ?? [],
    vault_documents: documents.data ?? [],
    secure_notes: notes.data ?? [],
    secure_wallet: wallet.data ?? [],
    secure_credentials: credentials.data ?? [],
  };
```

Replace:

```typescript
      counts: {
        passwords: records.vault_items.length,
        documents: records.vault_documents.length,
        notes: records.secure_notes.length,
        wallet: records.secure_wallet.length,
      },
```

with:

```typescript
      counts: {
        passwords: records.vault_items.length,
        documents: records.vault_documents.length,
        notes: records.secure_notes.length,
        wallet: records.secure_wallet.length,
        credentials: records.secure_credentials.length,
      },
```

- [ ] **Step 4: Update `vaultRestore.ts`**

Replace:

```typescript
export interface RestoreProgress {
  stage: "documents" | "passwords" | "notes" | "wallet";
  completed: number;
  total: number;
}

export interface RestoreResult {
  restored: { passwords: number; documents: number; notes: number; wallet: number };
  errors: string[];
}
```

with:

```typescript
export interface RestoreProgress {
  stage: "documents" | "passwords" | "notes" | "wallet" | "credentials";
  completed: number;
  total: number;
}

export interface RestoreResult {
  restored: { passwords: number; documents: number; notes: number; wallet: number; credentials: number };
  errors: string[];
}
```

Replace:

```typescript
  const errors: string[] = [];
  const restored = { passwords: 0, documents: 0, notes: 0, wallet: 0 };
```

with:

```typescript
  const errors: string[] = [];
  const restored = { passwords: 0, documents: 0, notes: 0, wallet: 0, credentials: 0 };
```

After the existing wallet-restore loop (the block ending in `onProgress?.({ stage: "wallet", completed: index + 1, total: walletRows.length });` followed by the closing `}`), add a new credentials-restore loop, then the function's closing brace. Replace:

```typescript
  const walletRows = (backup.records.secure_wallet ?? []) as Array<Record<string, unknown>>;
  onProgress?.({ stage: "wallet", completed: 0, total: walletRows.length });
  for (let index = 0; index < walletRows.length; index += 1) {
    const row = walletRows[index];
    const { error } = await supabase.from("secure_wallet").insert({
      user_id: userId,
      title: row.title,
      type: row.type,
      encrypted_content: row.encrypted_content,
      iv: row.iv,
      salt: row.salt,
    });
    if (error) errors.push(`Wallet item "${String(row.title ?? "untitled")}" could not be restored: ${error.message}`);
    else restored.wallet += 1;
    onProgress?.({ stage: "wallet", completed: index + 1, total: walletRows.length });
  }

  return { restored, errors };
}
```

with:

```typescript
  const walletRows = (backup.records.secure_wallet ?? []) as Array<Record<string, unknown>>;
  onProgress?.({ stage: "wallet", completed: 0, total: walletRows.length });
  for (let index = 0; index < walletRows.length; index += 1) {
    const row = walletRows[index];
    const { error } = await supabase.from("secure_wallet").insert({
      user_id: userId,
      title: row.title,
      type: row.type,
      encrypted_content: row.encrypted_content,
      iv: row.iv,
      salt: row.salt,
    });
    if (error) errors.push(`Wallet item "${String(row.title ?? "untitled")}" could not be restored: ${error.message}`);
    else restored.wallet += 1;
    onProgress?.({ stage: "wallet", completed: index + 1, total: walletRows.length });
  }

  const credentialRows = (backup.records.secure_credentials ?? []) as Array<Record<string, unknown>>;
  onProgress?.({ stage: "credentials", completed: 0, total: credentialRows.length });
  for (let index = 0; index < credentialRows.length; index += 1) {
    const row = credentialRows[index];
    const { error } = await supabase.from("secure_credentials").insert({
      user_id: userId,
      title: row.title,
      type: row.type,
      encrypted_content: row.encrypted_content,
      iv: row.iv,
      salt: row.salt,
      category: row.category ?? "Uncategorized",
    });
    if (error) errors.push(`Credential "${String(row.title ?? "untitled")}" could not be restored: ${error.message}`);
    else restored.credentials += 1;
    onProgress?.({ stage: "credentials", completed: index + 1, total: credentialRows.length });
  }

  return { restored, errors };
}
```

- [ ] **Step 5: Update `BackupSettings.tsx`**

Replace:

```typescript
const RECORD_LABELS: Record<"passwords" | "documents" | "notes" | "wallet", string> = {
  passwords: "Passwords",
  documents: "Documents",
  notes: "Notes",
  wallet: "Wallet & bank records",
};
```

with:

```typescript
const RECORD_LABELS: Record<"passwords" | "documents" | "notes" | "wallet" | "credentials", string> = {
  passwords: "Passwords",
  documents: "Documents",
  notes: "Notes",
  wallet: "Wallet & bank records",
  credentials: "Credentials",
};
```

Replace:

```tsx
      for (const key of ["vault_items", "vault_documents", "secure_notes", "secure_wallet_cards", "secure_wallet_banks"]) {
        invalidateCache(key);
      }
```

with:

```tsx
      const credentialCacheKeys = ["ssh_key", "crypto_wallet", "api_credential", "wifi_credential", "two_factor_backup"].map((type) => `secure_credentials:${type}`);
      for (const key of ["vault_items", "vault_documents", "secure_notes", "secure_wallet_cards", "secure_wallet_banks", ...credentialCacheKeys]) {
        invalidateCache(key);
      }
```

Replace:

```tsx
                This will add {parsedBackup.manifest.counts.passwords} passwords, {parsedBackup.manifest.counts.documents} documents, {parsedBackup.manifest.counts.notes} notes, and {parsedBackup.manifest.counts.wallet} wallet &amp; bank records to this vault.
```

with:

```tsx
                This will add {parsedBackup.manifest.counts.passwords} passwords, {parsedBackup.manifest.counts.documents} documents, {parsedBackup.manifest.counts.notes} notes, {parsedBackup.manifest.counts.wallet} wallet &amp; bank records, and {parsedBackup.manifest.counts.credentials} credentials to this vault.
```

Replace:

```tsx
                Restored {restoreResult.restored.passwords} passwords, {restoreResult.restored.documents} documents, {restoreResult.restored.notes} notes, and {restoreResult.restored.wallet} wallet &amp; bank records.
```

with:

```tsx
                Restored {restoreResult.restored.passwords} passwords, {restoreResult.restored.documents} documents, {restoreResult.restored.notes} notes, {restoreResult.restored.wallet} wallet &amp; bank records, and {restoreResult.restored.credentials} credentials.
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test tests/credential-vault-backup-restore.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/vaultBackup.ts src/lib/vaultRestore.ts src/components/settings/BackupSettings.tsx tests/credential-vault-backup-restore.test.mjs
git commit -m "feat: include the five credential types in vault backup export and restore"
```

---

## Task 8: Extend master password rotation to `secure_credentials`

**Files:**
- Create: `supabase/migrations/20260723160000_rotate_master_key_ciphertexts_v2.sql`
- Modify: `src/lib/masterPasswordRotation.ts`
- Modify: `tests/master-password-rotation.test.mjs`

**Interfaces:**
- Consumes: `secure_credentials` table (Task 1); the existing `rotate_master_key_ciphertexts` function (being replaced) and `masterPasswordRotation.ts` (being extended).
- Produces: `rotate_master_key_ciphertexts(p_items, p_notes, p_wallet, p_documents, p_credentials)` (5-parameter version, old 4-parameter overload dropped); `rotateMasterPassword()` now fetches/decrypts/re-encrypts `secure_credentials` too, and its RPC call includes `p_credentials`.

This is the critical integration point flagged in the design spec: without it, any SSH key / crypto passphrase / API credential / WiFi password / 2FA backup code is silently left encrypted under the OLD master password after a rotation, since the old password is discarded from memory once rotation completes.

- [ ] **Step 1: Write the failing test**

Add to `tests/master-password-rotation.test.mjs` (append at the end of the file, after the existing `SecuritySettings renders an entry point...` test):

```javascript
test("rotate_master_key_ciphertexts v2 migration adds secure_credentials as a fifth table, replacing the old 4-parameter function", () => {
  const sql = read("supabase/migrations/20260723160000_rotate_master_key_ciphertexts_v2.sql");

  // The old 4-parameter overload is dropped outright, not left dangling with stale grants.
  assert.match(sql, /drop function if exists public\.rotate_master_key_ciphertexts\(jsonb, jsonb, jsonb, jsonb\);/);

  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);

  assert.match(sql, /jsonb_array_length\(p_credentials\)\s*!=\s*v_expected_credentials/);
  assert.match(sql, /update public\.secure_credentials as t/);
  assert.match(sql, /from jsonb_to_recordset\(p_credentials\) as r\(id uuid, encrypted_content text, iv text, salt text\)/);
  assert.match(sql, /where t\.id = r\.id and t\.user_id = auth\.uid\(\);/);

  const diagnosticsCount = (sql.match(/get diagnostics v_updated = row_count/g) ?? []).length;
  assert.equal(diagnosticsCount, 5, "expected one row-count check per table (items, notes, wallet, documents, credentials)");

  assert.match(sql, /revoke all on function public\.rotate_master_key_ciphertexts\(jsonb, jsonb, jsonb, jsonb, jsonb\) from public, anon, authenticated;/);
  assert.match(sql, /grant execute on function public\.rotate_master_key_ciphertexts\(jsonb, jsonb, jsonb, jsonb, jsonb\) to authenticated;/);
  assert.doesNotMatch(sql, /grant execute[^;]*to[^;]*anon/);
});

test("masterPasswordRotation now touches secure_credentials as a fifth table, in the same old-then-new password order", () => {
  const source = read("src/lib/masterPasswordRotation.ts");

  assert.match(source, /from\("secure_credentials"\)/);
  assert.match(source, /p_credentials:/);

  // The credentials loop decrypts with the old password and re-encrypts with the new one, same as every other table.
  const credentialsBlockStart = source.indexOf("for (const row of credentials)");
  assert.ok(credentialsBlockStart > -1, "expected a decrypt/re-encrypt loop over `credentials`");
  const credentialsBlock = source.slice(credentialsBlockStart, source.indexOf("onProgress?.({ stage: \"committing\""));
  assert.match(credentialsBlock, /decryptText\([^)]*oldPassword\)/);
  assert.match(credentialsBlock, /encryptText\([^)]*newPassword\)/);

  // The RPC call is still made exactly once, with all five payloads, after every loop.
  const rpcIndex = source.indexOf("supabase.rpc(\"rotate_master_key_ciphertexts\"");
  assert.ok(rpcIndex > credentialsBlockStart, "credentials must be rotated before the rpc commit call");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/master-password-rotation.test.mjs`
Expected: FAIL on the two new tests (migration file doesn't exist; `masterPasswordRotation.ts` has no `secure_credentials` references yet). The pre-existing tests in this file still pass unchanged.

- [ ] **Step 3: Write the v2 migration**

Create `supabase/migrations/20260723160000_rotate_master_key_ciphertexts_v2.sql`:

```sql
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
```

- [ ] **Step 4: Update `masterPasswordRotation.ts`**

Replace the type aliases:

```typescript
export type RotationStage = "items" | "notes" | "wallet" | "documents" | "committing" | "cleanup";
```

with:

```typescript
export type RotationStage = "items" | "notes" | "wallet" | "documents" | "credentials" | "committing" | "cleanup";
```

Replace:

```typescript
type ItemRow = { id: string; encrypted_data: string; iv: string; salt: string };
type NoteRow = { id: string; encrypted_content: string; iv: string; salt: string };
type WalletRow = { id: string; encrypted_content: string; iv: string; salt: string };
type DocumentRow = { id: string; storage_path: string; iv: string; salt: string };
```

with:

```typescript
type ItemRow = { id: string; encrypted_data: string; iv: string; salt: string };
type NoteRow = { id: string; encrypted_content: string; iv: string; salt: string };
type WalletRow = { id: string; encrypted_content: string; iv: string; salt: string };
type DocumentRow = { id: string; storage_path: string; iv: string; salt: string };
type CredentialRow = { id: string; encrypted_content: string; iv: string; salt: string };
```

Replace:

```typescript
  const [itemsRes, notesRes, walletRes, documentsRes] = await Promise.all([
    supabase.from("vault_items").select("id,encrypted_data,iv,salt"),
    supabase.from("secure_notes").select("id,encrypted_content,iv,salt"),
    supabase.from("secure_wallet").select("id,encrypted_content,iv,salt"),
    supabase.from("vault_documents").select("id,storage_path,iv,salt"),
  ]);
  if (itemsRes.error || notesRes.error || walletRes.error || documentsRes.error) {
    throw new MasterPasswordRotationError("Could not read your vault. Nothing was changed.");
  }

  const items = (itemsRes.data ?? []) as ItemRow[];
  const notes = (notesRes.data ?? []) as NoteRow[];
  const wallet = (walletRes.data ?? []) as WalletRow[];
  const documents = (documentsRes.data ?? []) as DocumentRow[];
  const totalRows = items.length + notes.length + wallet.length + documents.length;
  let completed = 0;
```

with:

```typescript
  const [itemsRes, notesRes, walletRes, documentsRes, credentialsRes] = await Promise.all([
    supabase.from("vault_items").select("id,encrypted_data,iv,salt"),
    supabase.from("secure_notes").select("id,encrypted_content,iv,salt"),
    supabase.from("secure_wallet").select("id,encrypted_content,iv,salt"),
    supabase.from("vault_documents").select("id,storage_path,iv,salt"),
    supabase.from("secure_credentials").select("id,encrypted_content,iv,salt"),
  ]);
  if (itemsRes.error || notesRes.error || walletRes.error || documentsRes.error || credentialsRes.error) {
    throw new MasterPasswordRotationError("Could not read your vault. Nothing was changed.");
  }

  const items = (itemsRes.data ?? []) as ItemRow[];
  const notes = (notesRes.data ?? []) as NoteRow[];
  const wallet = (walletRes.data ?? []) as WalletRow[];
  const documents = (documentsRes.data ?? []) as DocumentRow[];
  const credentials = (credentialsRes.data ?? []) as CredentialRow[];
  const totalRows = items.length + notes.length + wallet.length + documents.length + credentials.length;
  let completed = 0;
```

Right after the existing documents loop and before the `onProgress?.({ stage: "committing", ...` line, insert a new credentials loop. Replace:

```typescript
  onProgress?.({ stage: "committing", completed: totalRows, total: totalRows });
  const { error: rpcError } = await supabase.rpc("rotate_master_key_ciphertexts", {
    p_items: rotatedItems,
    p_notes: rotatedNotes,
    p_wallet: rotatedWallet,
    p_documents: rotatedDocuments,
  });
```

with:

```typescript
  const rotatedCredentials = [];
  for (const row of credentials) {
    const plaintext = await decryptText(row.encrypted_content, row.salt, row.iv, oldPassword);
    const encrypted = await encryptText(plaintext, newPassword);
    rotatedCredentials.push({ id: row.id, encrypted_content: encrypted.ciphertext, iv: encrypted.iv, salt: encrypted.salt });
    completed += 1;
    onProgress?.({ stage: "credentials", completed, total: totalRows });
  }

  onProgress?.({ stage: "committing", completed: totalRows, total: totalRows });
  const { error: rpcError } = await supabase.rpc("rotate_master_key_ciphertexts", {
    p_items: rotatedItems,
    p_notes: rotatedNotes,
    p_wallet: rotatedWallet,
    p_documents: rotatedDocuments,
    p_credentials: rotatedCredentials,
  });
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/master-password-rotation.test.mjs`
Expected: PASS (all tests, including the two new ones and every pre-existing one unchanged).

- [ ] **Step 6: Type-check and full test suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `node --test tests/*.test.mjs`
Expected: all tests pass (this project's full suite, including every test added in Tasks 1-8).

- [ ] **Step 7: Push the migration**

Run: `supabase db push`
Expected: prompts to confirm, then applies `20260723160000_rotate_master_key_ciphertexts_v2.sql`. Confirm with the user before answering the CLI's `[Y/n]` prompt.

- [ ] **Step 8: Verify live via an unauthenticated request**

Run something equivalent to:
```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/rotate_master_key_ciphertexts" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"p_items":[],"p_notes":[],"p_wallet":[],"p_documents":[],"p_credentials":[]}'
```
Expected: a `42501: permission denied for function rotate_master_key_ciphertexts` response - confirms the new 5-parameter function exists live and still correctly rejects anon calls, mirroring the verification already done for the original 4-parameter version.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260723160000_rotate_master_key_ciphertexts_v2.sql src/lib/masterPasswordRotation.ts tests/master-password-rotation.test.mjs
git commit -m "feat: extend master password rotation to cover the five new credential types"
```

---

## Final Verification

After Task 8, before considering the feature done:

- [ ] Run the full suite once more: `node --test tests/*.test.mjs` - all tests pass.
- [ ] Run `npx tsc --noEmit` - no errors.
- [ ] Run `next build` (or this project's build script) - clean build, exit 0.
- [ ] Manually confirm (or delegate to a reviewer) that a full round-trip works: add one item of each new type, change the master password, and verify all five are still readable afterward - this is the one behavior no structural/regex test can actually prove, since it requires a live Supabase project and a real master key.
