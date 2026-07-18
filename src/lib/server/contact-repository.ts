import "server-only";

import { createHmac } from "node:crypto";

import type { ContactSubmissionInput } from "@/lib/contact";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

export class ContactRateLimitError extends Error {
  constructor() {
    super("CONTACT_RATE_LIMITED");
    this.name = "ContactRateLimitError";
  }
}

function clientHash(clientAddress: string) {
  const salt = process.env.CONTACT_RATE_LIMIT_SALT;
  if (!salt || salt.length < 32) throw new Error("CONTACT_RATE_LIMIT_NOT_CONFIGURED");
  return createHmac("sha256", salt).update(clientAddress).digest("hex");
}

export async function createContactSubmission(
  submission: Omit<ContactSubmissionInput, "company">,
  clientAddress: string,
) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("submit_contact_message", {
    p_name: submission.name,
    p_email: submission.email,
    p_topic: submission.topic,
    p_subject: submission.subject,
    p_message: submission.message,
    p_client_hash: clientHash(clientAddress),
  });

  if (error) {
    if (error.message.includes("CONTACT_RATE_LIMITED")) throw new ContactRateLimitError();
    throw new Error("CONTACT_SUBMISSION_FAILED");
  }
  if (typeof data !== "string") throw new Error("CONTACT_SUBMISSION_FAILED");
  return data;
}
