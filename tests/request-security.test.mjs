import assert from "node:assert/strict";
import { test } from "node:test";

import { readBoundedJson, RequestSecurityError } from "../src/lib/server/request-security.ts";

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
