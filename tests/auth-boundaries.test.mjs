import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("privileged Supabase client is server-only and prefers the secret key", () => {
  const admin = read("src/lib/server/supabase-admin.ts");
  assert.match(admin, /import "server-only"/);
  assert.match(admin, /SUPABASE_SECRET_KEY\s*\?\?\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(read("src/lib/supabase.ts"), /SECRET_KEY|SERVICE_ROLE/);
});

test("public Supabase clients prefer publishable keys with legacy fallback", () => {
  for (const file of ["src/lib/supabase.ts", "src/lib/server/supabase.ts", "src/lib/server/session-proxy.ts"]) {
    const source = read(file);
    assert.match(source, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\s*\?\?\s*process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/, file);
    assert.doesNotMatch(source, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/, file);
  }
  assert.match(read("src/lib/supabase.ts"), /createBrowserClient/);
});

test("server Supabase client uses async cookies and tolerates Server Component writes", () => {
  const server = read("src/lib/server/supabase.ts");
  assert.match(server, /createServerClient/);
  assert.match(server, /const cookieStore = await cookies\(\)/);
  assert.match(server, /getAll/);
  assert.match(server, /setAll/);
  assert.match(server, /try\s*\{/);
  assert.match(server, /catch\s*\{/);
});

test("Next 16 uses Proxy only for session refresh", () => {
  const proxy = read("src/proxy.ts");
  assert.match(proxy, /export async function proxy/);
  assert.match(proxy, /refreshSupabaseSession/);
  assert.doesNotMatch(proxy, /app_members|ADMIN_USER_IDS/);

  const refresh = read("src/lib/server/session-proxy.ts");
  assert.match(refresh, /auth\.getUser\(\)/);
  assert.doesNotMatch(refresh, /app_members|ADMIN_USER_IDS|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});

test("authorization uses immutable user ids and active membership", () => {
  const access = read("src/lib/server/access.ts");
  assert.match(access, /ADMIN_USER_IDS/);
  assert.match(access, /parseAdminUserIds/);
  assert.match(access, /status[^\n]+active/);
  assert.match(access, /\.select\("user_id,status"\)/);
  assert.match(access, /createSupabaseAdminClient/);
  assert.doesNotMatch(access, /getSession\(|\.email|user_metadata/);
});

test("authorization errors expose the exact access failure codes", () => {
  const access = read("src/lib/server/access.ts");
  for (const code of [
    "UNAUTHENTICATED",
    "NOT_ADMIN",
    "MEMBERSHIP_MISSING",
    "MEMBERSHIP_INVITED",
    "MEMBERSHIP_SUSPENDED",
    "MEMBERSHIP_REVOKED",
  ]) {
    assert.match(access, new RegExp(`\\b${code}\\b`));
  }
  assert.match(access, /status:\s*401\s*\|\s*403/);
});

test("cookie and bearer authorization verify users with getUser", () => {
  const access = read("src/lib/server/access.ts");
  assert.match(access, /export async function requireUser/);
  assert.match(access, /auth\.getUser\(\)/);
  assert.match(access, /export async function requireActiveMemberForToken/);
  assert.match(access, /auth\.getUser\(accessToken\)/);
  assert.doesNotMatch(access, /getSession\(/);
});
