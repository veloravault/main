# Invite-only production rollout (superseded)

**This runbook describes the invite-only access model that Velora Vault no longer uses.** The application now uses open self-serve signup — see the README's "Signup architecture" section and `supabase/migrations/*_self_signup_membership.sql`. The invite-only tables, RPCs, and email template referenced below remain in the database, unused, but the routes and admin UI this runbook describes have been removed from the codebase. Kept for historical reference only; do not follow it for a current rollout.

---

This is the operator runbook for enabling Velora Vault's invite-only access model in a hosted Supabase project. Execute it in order, record evidence for every gate, and stop on the first unexpected result. No hosted changes are performed by this repository; cloning, building, or deploying the application does not apply SQL, edit Auth settings, send invitations, or change DNS.

Use a staging project first. Replace values such as `OWNER_UUID` and `YOUR_PRODUCTION_ORIGIN` locally—never commit real keys, SMTP credentials, tokens, or user data.

## Preconditions

- The application commit passed `npm test`, `npm run lint`, `npm run build`, `npm audit --audit-level=high`, and `git diff --check`.
- `YOUR_PRODUCTION_ORIGIN` is the one canonical HTTPS origin, without a trailing slash.
- A maintenance window and a rollback owner are assigned.
- The operator can access Supabase Database, Auth, API Keys, URL Configuration, Email Templates, SMTP, Security Advisor, and database backups.
- The existing vault remains available until the verification gates below pass.

## 1. Database backup

1. Create a fresh logical or platform backup before running SQL.
2. Record its timestamp, project ref, region, application commit, database migration state, and restore procedure in the release ticket.
3. Prove the backup is restorable in a non-production project or confirm the most recent restore drill is within policy.
4. Export counts only—not row contents—for `vault_items`, `vault_documents`, `secure_notes`, and `secure_wallet` as a post-migration comparison baseline.

Do not continue without a restorable backup.

## 2. Apply `security_hardening.sql`

Inspect the hosted policies first. If the avatar ownership hardening has not already been applied, run the repository's [`security_hardening.sql`](../security_hardening.sql) in the Supabase SQL editor as one reviewed change. It restricts avatar writes to the authenticated user's UUID folder and does not remove the existing public-read policy.

Verify the three avatar write policies exist and use both `bucket_id = 'avatars'` and `(select auth.uid())::text = (storage.foldername(name))[1]`. If the equivalent policies already exist, record that evidence and do not create duplicates.

## 3. Apply `invite_access_schema.sql`

Review and then run [`invite_access_schema.sql`](../invite_access_schema.sql) only after step 2. It creates the access request, membership, audit, and rate-limit state; installs state-transition functions; replaces vault/storage policies with active-membership checks; and backfills existing confirmed users who already own vault data.

Immediately compare the four vault table counts with the backup baseline. This migration must not delete or rewrite vault records.

Run these catalog assertions:

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in (
    'access_requests', 'app_members', 'admin_audit_log',
    'access_request_rate_limits', 'vault_items', 'vault_documents',
    'secure_notes', 'secure_wallet'
  )
order by relname;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where (schemaname = 'public' and tablename in (
  'app_members', 'vault_items', 'vault_documents', 'secure_notes', 'secure_wallet'
)) or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'consume_access_request_rate_limit',
    'claim_access_request_invitation',
    'complete_access_request_invitation',
    'reconcile_confirmed_invite',
    'activate_invited_member'
  )
order by routine_name, grantee;
```

Expected: every listed table has RLS enabled; vault policies require both row/path ownership and `app_members.status = 'active'`; transition functions are executable by the privileged role but not by `public`, `anon`, or `authenticated`.

## 4. Verify Data API grants and RLS

Data API privileges and RLS are separate gates. Check explicit table grants:

```sql
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'access_requests', 'app_members', 'admin_audit_log',
    'access_request_rate_limits', 'vault_items', 'vault_documents',
    'secure_notes', 'secure_wallet'
  )
  and grantee in ('anon', 'authenticated', 'service_role')
group by table_name, grantee
order by table_name, grantee;
```

Expected access matrix:

| Client | Access tables | Vault tables/storage |
| --- | --- | --- |
| `anon` publishable client | No direct table access | No rows and no writes |
| Authenticated invited member | Own `app_members` row only | No rows and no writes until active |
| Authenticated active member | Own `app_members` row only | Own rows/files only |
| Authenticated revoked member | Own membership status only | No rows and no writes |
| Server secret client | Required admin/repository access | Privileged; server-only |

Verify that matrix with separate clients/tokens, not only SQL-editor role changes. Use disposable test users and attempt SELECT, INSERT, UPDATE, DELETE, document download, and storage replacement. Storage replacement must prove SELECT + INSERT + UPDATE behavior. Never put the secret or legacy service-role key in a browser, URL, screenshot, or shared log.

Run Supabase Security Advisor after the checks and resolve relevant findings before continuing.

## 5. Owner UUID and existing-member backfill

Obtain the owner's immutable Auth UUID from Authentication > Users (or a privileged query), not from email, `user_metadata`, display name, or a JWT copied into configuration.

```sql
select id, lower(email) as email, email_confirmed_at
from auth.users
where id = 'OWNER_UUID'::uuid;

select user_id, email, status, access_request_id
from public.app_members
where user_id = 'OWNER_UUID'::uuid;
```

The owner must have one canonical email and an `active` membership. The schema backfill activates confirmed users who already own vault data. Compare all pre-existing data owners against `app_members`:

```sql
with owners as (
  select user_id from public.vault_items
  union select user_id from public.vault_documents
  union select user_id from public.secure_notes
  union select user_id from public.secure_wallet
)
select owners.user_id, member.status
from owners
left join public.app_members member on member.user_id = owners.user_id
where member.user_id is null or member.status <> 'active';
```

Expected: zero rows. If the owner has no existing vault rows and therefore was not backfilled, insert exactly that verified Auth identity as active:

```sql
insert into public.app_members (user_id, email, status, activated_at)
select id, lower(email), 'active', now()
from auth.users
where id = 'OWNER_UUID'::uuid and email is not null
on conflict (user_id) do update
set status = 'active', activated_at = coalesce(public.app_members.activated_at, now());
```

Set `ADMIN_USER_IDS=OWNER_UUID` from that immutable Auth UUID. Start with one owner UUID only. Do not authorize by email or metadata.

## 6. Deployment environment

Configure the deployment from `env.example.txt`:

- `NEXT_PUBLIC_SUPABASE_URL`: hosted project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: current `sb_publishable_…` browser key.
- `SUPABASE_SECRET_KEY`: current `sb_secret_…` server-only key.
- `ADMIN_USER_IDS`: verified immutable owner Auth UUID.
- `ACCESS_REQUEST_HMAC_SECRET`: at least 32 cryptographically random bytes, server-only.
- `APP_URL`: exact canonical production origin, for example `https://vault.example.com`; no trailing slash or path.
- Existing AI-provider keys only where their current application features require them.

Do not expose `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_USER_IDS`, or `ACCESS_REQUEST_HMAC_SECRET` through `NEXT_PUBLIC_`, client code, logs, or build output. Deploy once and inspect the browser bundle/network panel to confirm no server value is present.

Keep `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` only as temporary legacy fallbacks during migration. Current publishable/secret keys and legacy keys can coexist; retirement happens only at step 13.

## 7. Site URL and redirect allowlist

In Supabase Authentication > URL Configuration set:

- Site URL: `https://YOUR_PRODUCTION_ORIGIN`
- Exact development redirect: `http://localhost:3000/accept-invite`
- Exact production redirect: `https://YOUR_PRODUCTION_ORIGIN/accept-invite`

Use the actual canonical origin in place of the placeholder. Do not add wildcards, preview-domain globs, alternate schemes, or broad paths to production. The server passes `${APP_URL}/accept-invite` to `inviteUserByEmail`; therefore `APP_URL`, Site URL, and this allowlist must agree exactly.

The email's first GET lands on `/accept-invite` and does not call `verifyOtp`. The user must press **Accept invitation**, which submits same-origin POST `/auth/confirm`; only that POST consumes the token.

## 8. Invitation template and email tracking

In Authentication > Email Templates > Invite user:

1. Set a restrained subject such as `Your Velora Vault invitation is ready`.
2. Install the exact contents of [`docs/supabase/invite-email.html`](supabase/invite-email.html).
3. Send previews to authorized internal addresses.
4. Confirm the rendered message contains exactly one link to `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite`; `inviteUserByEmail` supplies the exact allow-listed `/accept-invite` URL for the current environment.
5. Disable click/open email tracking and link rewriting in the SMTP provider. Rewritten links can break Auth verification.

The template intentionally includes no remote images, personalization metadata, requester name, marketing copy, analytics, or master key. Do not replace the custom `TokenHash` URL with `ConfirmationURL`; automated security scanners can prefetch and consume a direct confirmation URL.

## 9. Custom SMTP, SPF, DKIM, and DMARC

Supabase's default SMTP is not a production mail service. Configure a dedicated authentication sending domain and From address in Authentication > SMTP Settings, using credentials from the chosen provider.

At the sending domain:

1. Publish the provider's SPF record and verify there is only one effective SPF policy.
2. Publish and validate provider DKIM selectors.
3. Publish DMARC, begin with monitored policy as appropriate, inspect aggregate reports, and advance enforcement according to the organization's mail policy.
4. Keep authentication and marketing sending domains/reputations separate.
5. Confirm reverse-path, From alignment, TLS, bounce handling, and provider rate limits.
6. Keep click/open tracking and URL rewriting disabled.

Use DNS and provider verification tools to prove SPF, DKIM, and DMARC pass before inviting external users. Store SMTP credentials only in Supabase/provider secret configuration.

## 10. Disable public signup

In Authentication > Sign In / Providers > Email, turn **Allow new users to sign up** off. Keep email/password sign-in available for existing invited users. Also ensure anonymous sign-ins are off unless separately required and secured.

Prove public email signup is disabled with a disposable, never-before-used address. A direct `supabase.auth.signUp` attempt must fail and must not create an Auth user. Server-side `auth.admin.inviteUserByEmail` remains the only creation path used by this application.

## 11. Controlled invitation and onboarding

Use one disposable internal address with mailbox access:

1. Submit name and email at `/request-access`; confirm the response does not reveal whether the email already exists.
2. Sign in as the owner and open `/admin`.
3. Approve exactly one pending request and record the request UUID, audit result code, and Auth user UUID—never the token or email body.
4. Verify custom SMTP delivery, one unmodified link, and successful SPF/DKIM/DMARC results.
5. In a private browser profile, GET the email link. Refresh once before accepting to prove the token was not consumed by GET.
6. Press **Accept invitation**. Confirm POST `/auth/confirm` returns a session and redirects to `/onboarding`.
7. Create the Supabase sign-in password, then enter the separate existing vault master key in the client-only unlock step.
8. Confirm onboarding transitions both `access_requests.status` and `app_members.status` to `active`, then enters `/vault`.
9. Inspect Network, storage, Supabase Auth metadata, waitlist rows, and audit rows: the master key must remain in client memory and must never appear in the network or Supabase.

Do not use a real customer as the first invitation.

## 12. Denial checks

All checks must fail closed:

- Anonymous: `/admin`, `/vault`, protected APIs, and direct Data API vault access are denied.
- Public signup: `signUp` with a new email fails and creates no Auth identity.
- Non-admin active member: `/admin` and every admin Route Handler are denied even if email or metadata resembles the owner.
- Invited but incomplete member: `/vault`, vault APIs, vault tables, and private storage are denied before activation.
- Suspended/revoked member: vault route, APIs, table rows, and storage objects are denied after fresh sign-in/token refresh.
- Cross-owner access: an active member cannot read or mutate another user's vault rows or object paths.
- Unsafe requests: wrong-origin access submissions/confirmations, oversized bodies, unsupported media types, duplicate fields, and external redirect targets are rejected.
- Expired/invalid invite: returns the neutral recovery state without token, provider, or user-enumeration detail.

Also verify the landing page, request form, login, invitation screen, onboarding, existing vault, importer, settings, navigation, and Wallet at desktop/mobile widths in light, dark, and reduced-motion modes. Wallet must remain visually and behaviorally unchanged. Record zero unexpected console errors on principal flows.

## 13. Retire legacy keys

Only after the controlled invitation, denial matrix, RLS checks, browser review, logs, and monitoring all pass in production:

1. Run `rg "SUPABASE_SERVICE_ROLE_KEY" src` and confirm every remaining server consumer uses it only after `SUPABASE_SECRET_KEY ??` as a temporary fallback. Then run a fresh production build and runtime verification with the legacy variables absent.
2. Confirm every deployment and server job uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` successfully under that verification.
3. Remove `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from deployment environments.
4. Redeploy and rerun sign-in, request, approval, account deletion, onboarding, vault, RLS, and denial checks.
5. Disable legacy JWT-based API keys in Supabase Settings > API Keys according to the current platform migration procedure.
6. Monitor Auth, API, database, email, and application error rates through the rollback window.

Do not disable legacy keys while any deployment or job still depends on them.

## 14. Rollback

First stop new approvals by disabling the admin deployment/action path or revoking the application server's privileged deployment secret. Preserve the database backup and capture current counts/statuses.

### Before any invitation is accepted

If **no** Auth invitation has been accepted and there are no `app_members`/`access_requests` activation timestamps, the operator may roll the application back to the prior commit and re-enable the prior root vault route. Restore the previous environment and Auth URL/template settings as needed. Keep request/audit tables for diagnosis unless the approved database rollback explicitly restores the complete pre-migration backup.

### After activation data exists

Accepted invitations make rollback stateful. Do not delete or drop `app_members`, `access_requests`, `admin_audit_log`, or activation data. Do not remove active-membership RLS and expose vault data. Instead:

1. Disable new approvals and invitation delivery.
2. Keep existing members and access history intact.
3. Continue serving the gated `/vault` to active members, or enter a read-only/maintenance mode that still enforces authorization.
4. Fix forward, deploy, and rerun the complete access/RLS matrix.
5. Revoke only specifically compromised test memberships/sessions; do not mass-delete Auth users.

After accepted invitations, the prior public root-vault behavior is not a safe rollback target.

## Release evidence and deferred operator work

Attach these artifacts to the release ticket:

- Backup/restore evidence and before/after row counts.
- SQL catalog outputs for RLS, policies, grants, and function execution.
- Security Advisor result.
- Owner UUID verification and existing-member backfill query result.
- Redacted environment variable-name inventory (never values).
- Exact Site URL and redirect allowlist.
- Installed template hash/screenshot and proof email tracking is disabled.
- SMTP and SPF/DKIM/DMARC pass evidence.
- Public-signup failure and denial-matrix results.
- Controlled invitation state transitions and redacted delivery headers.
- Browser/network review, including absence of the master key and unchanged Wallet evidence.
- Legacy-key retirement or an explicitly dated deferred-retirement ticket.

Hosted SQL execution, Auth configuration, custom SMTP/DNS work, the real controlled invitation, hosted RLS probes, and legacy-key disabling are operator steps. They are deliberately deferred until an authorized operator runs this guide against the intended Supabase project.
