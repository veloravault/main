export const CONTACT_TOPICS = ["general", "account", "security", "privacy", "partnership"] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export type ContactSubmissionInput = {
  name: string;
  email: string;
  topic: ContactTopic;
  subject: string;
  message: string;
  company: string;
};

const CONTACT_FIELDS = new Set(["name", "email", "topic", "subject", "message", "company"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class ContactValidationError extends Error {
  readonly code: "INVALID_CONTACT_FIELDS" | "INVALID_CONTACT_SUBMISSION";

  constructor(code: ContactValidationError["code"]) {
    super(code);
    this.name = "ContactValidationError";
    this.code = code;
  }
}

function requiredString(value: unknown, minimum: number, maximum: number) {
  if (typeof value !== "string") throw new ContactValidationError("INVALID_CONTACT_SUBMISSION");
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new ContactValidationError("INVALID_CONTACT_SUBMISSION");
  }
  return normalized;
}

export function parseContactSubmission(payload: Record<string, unknown>): ContactSubmissionInput {
  if (Object.keys(payload).some((key) => !CONTACT_FIELDS.has(key))) {
    throw new ContactValidationError("INVALID_CONTACT_FIELDS");
  }

  const name = requiredString(payload.name, 2, 100);
  const email = requiredString(payload.email, 3, 254).toLowerCase();
  const subject = requiredString(payload.subject, 3, 160);
  const message = requiredString(payload.message, 20, 5_000);
  if (!EMAIL_PATTERN.test(email)) throw new ContactValidationError("INVALID_CONTACT_SUBMISSION");

  if (typeof payload.topic !== "string" || !CONTACT_TOPICS.includes(payload.topic as ContactTopic)) {
    throw new ContactValidationError("INVALID_CONTACT_SUBMISSION");
  }
  if (typeof payload.company !== "string" || payload.company.length > 200) {
    throw new ContactValidationError("INVALID_CONTACT_SUBMISSION");
  }

  return { name, email, topic: payload.topic as ContactTopic, subject, message, company: payload.company.trim() };
}
