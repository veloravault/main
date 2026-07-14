import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, test } from "node:test";

import {
  fingerprintAccessRequest,
  fingerprintAccessRequestIp,
  readBoundedJson,
  RequestSecurityError,
} from "../src/lib/server/request-security.ts";

const ORIGINAL_SECRET = process.env.ACCESS_REQUEST_HMAC_SECRET;
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.ACCESS_REQUEST_HMAC_SECRET;
  else process.env.ACCESS_REQUEST_HMAC_SECRET = ORIGINAL_SECRET;
});

test("access request fingerprints normalize email and IP without exposing either", () => {
  process.env.ACCESS_REQUEST_HMAC_SECRET = "a-test-secret-with-enough-entropy";
  const windowStart = "2026-07-14T09:15:00.000Z";

  const first = fingerprintAccessRequest("  Person@Example.COM ", " 203.0.113.42 ", windowStart);
  const equivalent = fingerprintAccessRequest("person@example.com", "203.0.113.42", windowStart);
  const expected = createHmac("sha256", process.env.ACCESS_REQUEST_HMAC_SECRET)
    .update(`access-request:email-ip:v1|person@example.com|203.0.113.42|${windowStart}`)
    .digest("hex");

  assert.equal(first, equivalent);
  assert.equal(first, expected);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first.includes("person@example.com"), false);
  assert.equal(first.includes("203.0.113.42"), false);
});

test("IP fingerprints are domain-separated and stay stable when an attacker rotates email", () => {
  process.env.ACCESS_REQUEST_HMAC_SECRET = "a-test-secret-with-enough-entropy";
  const windowStart = "2026-07-14T09:15:00.000Z";

  const firstPair = fingerprintAccessRequest("first@example.com", "203.0.113.42", windowStart);
  const secondPair = fingerprintAccessRequest("second@example.com", "203.0.113.42", windowStart);
  const firstIp = fingerprintAccessRequestIp("203.0.113.42", windowStart);
  const secondIp = fingerprintAccessRequestIp(" 203.0.113.42, 10.0.0.1 ", windowStart);
  const expectedIp = createHmac("sha256", process.env.ACCESS_REQUEST_HMAC_SECRET)
    .update(`access-request:ip:v1|203.0.113.42|${windowStart}`)
    .digest("hex");

  assert.notEqual(firstPair, secondPair);
  assert.equal(firstIp, secondIp);
  assert.equal(firstIp, expectedIp);
  assert.notEqual(firstIp, firstPair);
  assert.equal(firstIp.includes("203.0.113.42"), false);
});

test("access request fingerprints change across rate-limit windows", () => {
  process.env.ACCESS_REQUEST_HMAC_SECRET = "a-test-secret-with-enough-entropy";

  const first = fingerprintAccessRequest("person@example.com", "203.0.113.42", "2026-07-14T09:15:00.000Z");
  const next = fingerprintAccessRequest("person@example.com", "203.0.113.42", "2026-07-14T09:30:00.000Z");

  assert.notEqual(first, next);
});

test("access request fingerprinting requires its dedicated secret", () => {
  delete process.env.ACCESS_REQUEST_HMAC_SECRET;

  assert.throws(
    () => fingerprintAccessRequest("person@example.com", "203.0.113.42", "2026-07-14T09:15:00.000Z"),
    /ACCESS_REQUEST_HMAC_SECRET_NOT_CONFIGURED/,
  );
  assert.throws(
    () => fingerprintAccessRequestIp("203.0.113.42", "2026-07-14T09:15:00.000Z"),
    /ACCESS_REQUEST_HMAC_SECRET_NOT_CONFIGURED/,
  );
});

test("bounded request JSON requires application/json and exactly one object", async () => {
  const textRequest = new Request("https://vault.test/api/access-requests", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: JSON.stringify({ fullName: "Aarav Thakur", email: "aarav@example.com" }),
  });
  await assert.rejects(
    () => readBoundedJson(textRequest, 8_192),
    (error) => error instanceof RequestSecurityError && error.code === "UNSUPPORTED_MEDIA_TYPE" && error.status === 415,
  );

  for (const body of ["[]", "null", "{} {}"] ) {
    const request = new Request("https://vault.test/api/access-requests", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body,
    });
    await assert.rejects(
      () => readBoundedJson(request, 8_192),
      (error) => error instanceof RequestSecurityError && error.code === "INVALID_JSON" && error.status === 400,
    );
  }
});

test("bounded request JSON rejects a streamed body over 8 KiB despite a small declared length", async () => {
  const encoder = new TextEncoder();
  const request = new Request("https://vault.test/api/access-requests", {
    method: "POST",
    headers: {
      "content-length": "2",
      "content-type": "application/json",
    },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"payload":"'));
        controller.enqueue(encoder.encode("x".repeat(8_192)));
        controller.enqueue(encoder.encode('"}'));
        controller.close();
      },
    }),
    duplex: "half",
  });

  await assert.rejects(
    () => readBoundedJson(request, 8_192),
    (error) => error instanceof RequestSecurityError && error.code === "PAYLOAD_TOO_LARGE" && error.status === 413,
  );
});

test("access request repository enforces the durable limiter and duplicate-safe insert", () => {
  const repository = read("src/lib/server/access-repository.ts");

  assert.match(repository, /consume_access_request_rate_limit/);
  assert.match(repository, /ACCESS_REQUEST_PAIR_LIMIT\s*=\s*5/);
  assert.match(repository, /ACCESS_REQUEST_IP_LIMIT\s*=\s*20/);
  assert.match(repository, /p_limit:\s*limit/);
  assert.match(repository, /15\s*\*\s*60\s*\*\s*1_000/);
  assert.match(repository, /upsert\([\s\S]*onConflict:\s*"email"[\s\S]*ignoreDuplicates:\s*true/);
  assert.match(repository, /from\("access_request_rate_limits"\)[\s\S]*\.delete\(\)[\s\S]*\.lt\("window_started_at",\s*cutoff\)/);
  assert.doesNotMatch(repository, /console\.(?:log|error|warn)/);
});

test("public route keeps honeypot, throttling, and generic response semantics ordered safely", () => {
  const route = read("src/app/api/access-requests/route.ts");
  const handler = read("src/lib/server/access-request-handler.ts");
  const originIndex = handler.indexOf("deps.assertSameOrigin(request)");
  const readIndex = handler.indexOf("deps.readBoundedJson(request, deps.maxRequestBytes)");
  const honeypotIndex = handler.indexOf("body.website");
  const validationIndex = handler.indexOf("deps.parseAccessRequestInput(body)");
  const ipRateLimitIndex = handler.indexOf("deps.accessRequestIpLimit", validationIndex);
  const pairRateLimitIndex = handler.indexOf("deps.accessRequestPairLimit", ipRateLimitIndex);
  const insertIndex = handler.indexOf("await deps.insertAccessRequest", pairRateLimitIndex);

  assert.ok(originIndex >= 0 && readIndex > originIndex);
  assert.ok(honeypotIndex > readIndex && validationIndex > honeypotIndex);
  assert.ok(ipRateLimitIndex > validationIndex, "IP bucket must be consumed after validation");
  assert.ok(pairRateLimitIndex > ipRateLimitIndex, "pair bucket must be consumed after IP bucket");
  assert.ok(insertIndex > pairRateLimitIndex, "insert must happen only after both buckets allow");
  assert.match(route, /const MAX_REQUEST_BYTES = 8_192/);
  assert.match(handler, /accepted:\s*true\s*},\s*202/);
  assert.match(handler, /RATE_LIMITED"\s*},\s*429/);
  assert.match(handler, /REQUEST_UNAVAILABLE"\s*},\s*503/);
  assert.match(handler, /REQUEST_UNAVAILABLE/);
  assert.match(handler, /24\s*\*\s*60\s*\*\s*60\s*\*\s*1_000/);
  assert.match(handler, /parseInt\(fingerprint\.slice\(0,\s*2\),\s*16\)\s*%\s*32/);
  assert.doesNotMatch(`${route}\n${handler}`, /request\.json\(\)/);
  assert.doesNotMatch(`${route}\n${handler}`, /error\.message/);
});

test("public response settles while selected cleanup remains pending after it", async () => {
  const { handleAccessRequest } = await import("../src/lib/server/access-request-handler.ts");
  const pendingCleanup = new Promise(() => {});
  let cleanupStarted = false;

  const responsePromise = handleAccessRequest(
    new Request("https://vault.test/api/access-requests", {
      method: "POST",
      headers: {
        origin: "https://vault.test",
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.42",
      },
      body: JSON.stringify({ fullName: "Aarav Thakur", email: "aarav@example.com", website: "" }),
    }),
    {
      after(callback) {
        void callback();
      },
      assertSameOrigin() {},
      readBoundedJson: async () => ({ fullName: "Aarav Thakur", email: "aarav@example.com", website: "" }),
      parseAccessRequestInput: () => ({
        ok: true,
        value: { fullName: "Aarav Thakur", email: "aarav@example.com" },
      }),
      now: () => new Date("2026-07-14T09:16:00.000Z"),
      accessRequestWindowStart: () => "2026-07-14T09:15:00.000Z",
      fingerprintAccessRequest: () => `00${"a".repeat(62)}`,
      fingerprintAccessRequestIp: () => `00${"b".repeat(62)}`,
      accessRequestPairLimit: 5,
      accessRequestIpLimit: 20,
      consumeAccessRequestRateLimit: async () => true,
      insertAccessRequest: async () => {},
      cleanupExpiredRateLimits: async () => {
        cleanupStarted = true;
        return pendingCleanup;
      },
      isRequestSecurityError: () => false,
    },
  );

  const response = await Promise.race([
    responsePromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("response waited for cleanup")), 250)),
  ]);

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { accepted: true });
  assert.equal(cleanupStarted, true);
});

test("public handler consumes independent IP and pair buckets before insertion", async () => {
  const { handleAccessRequest } = await import("../src/lib/server/access-request-handler.ts");
  const consumed = [];
  let inserted = false;

  const response = await handleAccessRequest(
    new Request("https://vault.test/api/access-requests", {
      method: "POST",
      headers: {
        origin: "https://vault.test",
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.42",
      },
      body: JSON.stringify({ fullName: "Aarav Thakur", email: "aarav@example.com", website: "" }),
    }),
    {
      after() {},
      assertSameOrigin() {},
      readBoundedJson: async () => ({ fullName: "Aarav Thakur", email: "aarav@example.com", website: "" }),
      parseAccessRequestInput: () => ({ ok: true, value: { fullName: "Aarav Thakur", email: "aarav@example.com" } }),
      now: () => new Date("2026-07-14T09:16:00.000Z"),
      accessRequestWindowStart: () => "2026-07-14T09:15:00.000Z",
      fingerprintAccessRequest: () => "pair-fingerprint",
      fingerprintAccessRequestIp: () => "ip-fingerprint",
      accessRequestPairLimit: 5,
      accessRequestIpLimit: 20,
      consumeAccessRequestRateLimit: async (fingerprint, _window, limit) => {
        consumed.push([fingerprint, limit]);
        return true;
      },
      insertAccessRequest: async () => { inserted = true; },
      cleanupExpiredRateLimits: async () => {},
      isRequestSecurityError: () => false,
    },
  );

  assert.equal(response.status, 202);
  assert.deepEqual(consumed, [["ip-fingerprint", 20], ["pair-fingerprint", 5]]);
  assert.equal(inserted, true);
});

test("public handler rejects when either durable bucket is exhausted", async () => {
  const { handleAccessRequest } = await import("../src/lib/server/access-request-handler.ts");

  for (const exhausted of ["ip-fingerprint", "pair-fingerprint"]) {
    const consumed = [];
    let inserted = false;
    const response = await handleAccessRequest(
      new Request("https://vault.test/api/access-requests", {
        method: "POST",
        headers: { origin: "https://vault.test", "content-type": "application/json", "x-real-ip": "203.0.113.42" },
        body: JSON.stringify({ fullName: "Aarav Thakur", email: "aarav@example.com" }),
      }),
      {
        after() {},
        assertSameOrigin() {},
        readBoundedJson: async () => ({ fullName: "Aarav Thakur", email: "aarav@example.com" }),
        parseAccessRequestInput: () => ({ ok: true, value: { fullName: "Aarav Thakur", email: "aarav@example.com" } }),
        now: () => new Date("2026-07-14T09:16:00.000Z"),
        accessRequestWindowStart: () => "2026-07-14T09:15:00.000Z",
        fingerprintAccessRequest: () => "pair-fingerprint",
        fingerprintAccessRequestIp: () => "ip-fingerprint",
        accessRequestPairLimit: 5,
        accessRequestIpLimit: 20,
        consumeAccessRequestRateLimit: async (fingerprint) => {
          consumed.push(fingerprint);
          return fingerprint !== exhausted;
        },
        insertAccessRequest: async () => { inserted = true; },
        cleanupExpiredRateLimits: async () => {},
        isRequestSecurityError: () => false,
      },
    );

    assert.equal(response.status, 429);
    assert.deepEqual(await response.json(), { code: "RATE_LIMITED" });
    assert.equal(inserted, false);
    assert.ok(consumed.includes(exhausted));
  }
});

test("Next schedules selected cleanup after the response instead of awaiting it", () => {
  const route = read("src/app/api/access-requests/route.ts");

  assert.match(route, /import \{ after \} from "next\/server"/);
  assert.match(route, /after,/);
  assert.doesNotMatch(route, /finally\s*\{/);
  assert.doesNotMatch(route, /await cleanupIfSelected/);
});

test("request page preserves entries for retry and exposes accessible completion and errors", () => {
  const page = read("src/app/request-access/page.tsx");
  const form = read("src/components/access/RequestAccessForm.tsx");
  const css = read("src/app/request-access/request-access.module.css");

  assert.match(page, /<RequestAccessForm\s*\/>/);
  assert.match(form, /label[\s\S]*Full name/);
  assert.match(form, /label[\s\S]*Email/);
  assert.match(form, /name="website"/);
  assert.match(form, /<form[\s\S]*action="\/api\/access-requests"[\s\S]*method="post"/);
  assert.doesNotMatch(form, /method="get"/i);
  assert.match(form, /aria-live="polite"/);
  assert.match(form, /role="alert"/);
  assert.match(form, /Request received\. If an invitation becomes available, we’ll email you\./);
  assert.match(form, /navigator\.onLine/);
  assert.match(form, /Retry request/);
  assert.match(form, /setFullName/);
  assert.match(form, /setEmail/);
  assert.doesNotMatch(form, /setFullName\(""\)/);
  assert.doesNotMatch(form, /setEmail\(""\)/);
  assert.doesNotMatch(form, /master.?key|password/i);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width:\s*700px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
