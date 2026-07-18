import assert from "node:assert/strict";
import test from "node:test";

import { ContactValidationError, parseContactSubmission } from "../src/lib/contact.ts";

const validPayload = {
  name: "  Tejas Telkar  ",
  email: "  TEJAS@example.com ",
  topic: "security",
  subject: "  Passkey fallback question  ",
  message: "  I need help understanding the available secure fallback options.  ",
  company: "",
};

test("normalizes a valid contact submission", () => {
  assert.deepEqual(parseContactSubmission(validPayload), {
    name: "Tejas Telkar",
    email: "tejas@example.com",
    topic: "security",
    subject: "Passkey fallback question",
    message: "I need help understanding the available secure fallback options.",
    company: "",
  });
});

test("accepts only the documented contact fields", () => {
  assert.throws(
    () => parseContactSubmission({ ...validPayload, role: "admin" }),
    (error) => error instanceof ContactValidationError && error.code === "INVALID_CONTACT_FIELDS",
  );
});

test("validates topic, email, and field bounds", () => {
  const invalidPayloads = [
    { ...validPayload, topic: "billing" },
    { ...validPayload, email: "not-an-email" },
    { ...validPayload, name: "T" },
    { ...validPayload, subject: "No" },
    { ...validPayload, message: "Too short" },
    { ...validPayload, company: 42 },
  ];

  for (const payload of invalidPayloads) {
    assert.throws(
      () => parseContactSubmission(payload),
      (error) => error instanceof ContactValidationError && error.code === "INVALID_CONTACT_SUBMISSION",
    );
  }
});

test("preserves a populated honeypot for silent bot handling", () => {
  const parsed = parseContactSubmission({ ...validPayload, company: "Spam Incorporated" });
  assert.equal(parsed.company, "Spam Incorporated");
});
