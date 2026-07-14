import assert from "node:assert/strict";
import { test } from "node:test";
import {
  encodeInviteCursor,
  parseAccessRequestInput,
  parseAdminUserIds,
  parseInviteCursor,
  parseSafeNextPath,
} from "../src/lib/access/validation.ts";

test("access requests normalize valid name and email", () => {
  assert.deepEqual(parseAccessRequestInput({ fullName: "  Aarav   Thakur ", email: " AARAV@Example.COM " }), {
    ok: true,
    value: { fullName: "Aarav Thakur", email: "aarav@example.com" },
  });
});

test("access requests reject unexpected or oversized fields", () => {
  assert.equal(parseAccessRequestInput({ fullName: "A", email: "bad" }).ok, false);
  assert.equal(parseAccessRequestInput({ fullName: "Aarav Thakur", email: "a@example.com", role: "admin" }).ok, false);
});

test("admin ids accept only UUIDs", () => {
  assert.deepEqual(parseAdminUserIds("550e8400-e29b-41d4-a716-446655440000, bad"), new Set(["550e8400-e29b-41d4-a716-446655440000"]));
});

test("invite cursor round-trips requestedAt and id", () => {
  const value = { requestedAt: "2026-07-14T00:00:00.000Z", id: "550e8400-e29b-41d4-a716-446655440000" };
  assert.deepEqual(parseInviteCursor(encodeInviteCursor(value)), value);
  assert.equal(parseInviteCursor("not-a-cursor"), null);
});

test("invite cursor rejects malformed runtime shapes", () => {
  const id = "550e8400-e29b-41d4-a716-446655440000";

  assert.equal(parseInviteCursor(encodeInviteCursor({ requestedAt: 0, id })), null);
  assert.equal(parseInviteCursor(encodeInviteCursor({ requestedAt: "2026-07-14T00:00:00.000Z", id: 0 })), null);
  assert.equal(parseInviteCursor(encodeInviteCursor([])), null);
});

test("post-login navigation accepts only known internal destinations", () => {
  assert.equal(parseSafeNextPath("/admin"), "/admin");
  assert.equal(parseSafeNextPath("/vault"), "/vault");
  assert.equal(parseSafeNextPath("//evil.example"), "/vault");
  assert.equal(parseSafeNextPath("https://evil.example"), "/vault");
});
