import assert from "node:assert/strict";
import { test } from "node:test";

import { assertSameOrigin, readBoundedJson, RequestSecurityError } from "../src/lib/server/request-security.ts";

test("same-origin checks trust the canonical app and the actual request origin", () => {
  const previousAppUrl = process.env.APP_URL;
  process.env.APP_URL = "https://veloravault.in";

  try {
    for (const request of [
      new Request("https://veloravault.in/api/admin/support", {
        headers: { origin: "https://veloravault.in" },
      }),
      new Request("http://localhost:3000/api/admin/support", {
        headers: { origin: "http://localhost:3000" },
      }),
      new Request("https://preview.veloravault.test/api/admin/support", {
        headers: { origin: "https://preview.veloravault.test" },
      }),
      new Request("http://localhost:3000/api/admin/support", {
        headers: { origin: "null", referer: "http://localhost:3000/admin?view=support" },
      }),
    ]) {
      assert.doesNotThrow(() => assertSameOrigin(request));
    }
  } finally {
    if (previousAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousAppUrl;
  }
});

test("same-origin checks reject hostile, malformed, and missing request sources", () => {
  const previousAppUrl = process.env.APP_URL;
  process.env.APP_URL = "https://veloravault.in";

  try {
    for (const headers of [
      { origin: "https://evil.example" },
      { origin: "not a URL" },
      { origin: "null", referer: "https://evil.example/admin" },
      {},
    ]) {
      assert.throws(
        () => assertSameOrigin(new Request("http://localhost:3000/api/admin/support", { headers })),
        (error) => error instanceof RequestSecurityError && error.code === "ORIGIN_MISMATCH" && error.status === 403,
      );
    }
  } finally {
    if (previousAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousAppUrl;
  }
});

test("bounded request JSON requires application/json and exactly one object", async () => {
  const textRequest = new Request("https://vault.test/api/onboarding/complete", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: JSON.stringify({ completed: true }),
  });
  await assert.rejects(
    () => readBoundedJson(textRequest, 8_192),
    (error) => error instanceof RequestSecurityError && error.code === "UNSUPPORTED_MEDIA_TYPE" && error.status === 415,
  );

  for (const body of ["[]", "null", "{} {}"]) {
    const request = new Request("https://vault.test/api/onboarding/complete", {
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

test("bounded request JSON rejects a streamed body over the byte limit despite a small declared length", async () => {
  const encoder = new TextEncoder();
  const request = new Request("https://vault.test/api/onboarding/complete", {
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
