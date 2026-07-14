# Final whole-branch hardening report

## Scope

Implemented the three Important findings from the final branch review without changing Wallet behavior or the client-memory-only master-key model. No hosted Supabase mutation, invitation, or schema application was performed.

## Fixes

### Public access-request limiting

- Added domain-separated HMAC fingerprints for the email+IP pair and for the IP alone.
- The durable limiter now enforces both a 5 request pair limit and a 20 request IP limit per 15-minute window before insertion.
- Raw email/IP values are not stored in the limiter or logged.
- Both exhausted buckets return the same enumeration-safe `429 { code: "RATE_LIMITED" }` response.
- Cleanup remains bounded, probabilistic, and post-response.

### Account deletion

- Canonicalizes the verified Supabase user's email and fails closed when it is unavailable.
- Deletes `access_requests` PII only when both `auth_user_id` and canonical `email` match the verified identity.
- Fails closed on request cleanup errors before deleting the Auth user.
- Preserves modern `SUPABASE_SECRET_KEY` support with the legacy service-role fallback.
- Verified related foreign-key behavior: membership rows cascade on Auth deletion, while request/audit references are nulled safely.

### Member status mutation

- Replaced the split update/best-effort audit path with the service-role-only `mutate_member_status` RPC.
- Locks the membership row with `FOR UPDATE`, performs the status update and audit insertion in one database transaction, and rejects missing parameters.
- Allows invited/active to become suspended or revoked, suspended to become revoked, and treats revoked or duplicate suspension as conflicts. Revoked is terminal.
- Returns explicit `updated`, `not_found`, and `conflict` outcomes; the route maps these to DTO success, 404, and 409 without leaking database errors.
- Revokes function execution from PUBLIC/anon/authenticated and grants it only to service_role.

## TDD evidence

- RED: focused regression run produced 30 pass / 3 fail across `access-request-service`, `project-integrity`, and `admin-route-boundaries` before production changes.
- GREEN: focused regression run produced 45/45 pass after the three fixes.
- Additional RPC parameter validation was also introduced test-first (6/7 then 7/7).

## Final verification

- `npm test`: 121/121 pass.
- `npm run lint`: pass.
- `npm run build`: pass, including TypeScript and all 18 app routes. The pre-existing linked-worktree multiple-lockfile warning remains non-blocking.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- `git diff --check`: pass.
- Current Supabase guidance was checked for server-only Auth administration, function privileges, explicit execute revocation, RLS/service-role behavior, and empty `search_path` on privileged database functions.
