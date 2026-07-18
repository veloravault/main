"use client";

import { useState, type FormEvent } from "react";
import { ArrowRightIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react";

import styles from "./Contact.module.css";

type FormState = "idle" | "submitting" | "sent" | "error";

const ERROR_MESSAGES: Record<string, string> = {
  CONTACT_RATE_LIMITED: "You’ve sent several messages recently. Please try again in one hour.",
  INVALID_CONTACT_FIELDS: "Check the form and remove any unsupported fields.",
  INVALID_CONTACT_SUBMISSION: "Check each field and complete the highlighted requirements.",
  CONTACT_SERVICE_UNAVAILABLE: "Messages are temporarily unavailable. Email hello@veloravault.in instead.",
};

export function ContactForm() {
  const [state, setState] = useState<FormState>("idle");
  const [feedback, setFeedback] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setState("submitting");
    setFeedback("");

    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setState("error");
        setFeedback(ERROR_MESSAGES[result.error ?? ""] ?? "Your message could not be sent. Please try again.");
        return;
      }

      form.reset();
      setState("sent");
      setFeedback("Message sent. We’ll reply by email within one business day.");
    } catch {
      setState("error");
      setFeedback("Your message could not be sent. Check your connection and try again.");
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate={false}>
      <div className={styles.fieldRow}>
        <label className={styles.field}>
          <span>Name</span>
          <input name="name" type="text" minLength={2} maxLength={100} autoComplete="name" required />
        </label>
        <label className={styles.field}>
          <span>Email</span>
          <input name="email" type="email" maxLength={254} autoComplete="email" required />
        </label>
      </div>

      <label className={styles.field}>
        <span>What can we help with?</span>
        <select name="topic" defaultValue="general" required>
          <option value="general">General question</option>
          <option value="account">Account access</option>
          <option value="security">Security disclosure</option>
          <option value="privacy">Privacy or data request</option>
          <option value="partnership">Partnership</option>
        </select>
      </label>

      <label className={styles.field}>
        <span>Subject</span>
        <input name="subject" type="text" minLength={3} maxLength={160} required />
      </label>

      <label className={styles.field}>
        <span>Message</span>
        <textarea name="message" minLength={20} maxLength={5_000} rows={7} required />
        <small>Please include enough detail for us to act on your request.</small>
      </label>

      <label className={styles.honeypot} aria-hidden="true">
        Company
        <input name="company" type="text" tabIndex={-1} autoComplete="off" />
      </label>

      <button className={styles.submitButton} type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? (
          <><Loader2Icon aria-hidden="true" className={styles.spinner} /> Sending</>
        ) : (
          <>Send message <ArrowRightIcon aria-hidden="true" /></>
        )}
      </button>

      <div
        className={`${styles.feedback} ${state === "error" ? styles.feedbackError : ""}`}
        aria-live="polite"
      >
        {state === "sent" ? <CheckCircle2Icon aria-hidden="true" /> : null}
        {feedback}
      </div>
    </form>
  );
}
