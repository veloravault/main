"use client";

import { FormEvent, useState } from "react";
import { ArrowRightIcon } from "lucide-react";
import styles from "@/components/auth/auth-shell.module.css";

type FieldErrors = Partial<Record<"fullName" | "email" | "form", string>>;
type FormState = "editing" | "submitting" | "accepted" | "retry";

function responseErrors(value: unknown): FieldErrors {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("errors" in value)) return {};
  const errors = value.errors;
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return {};

  const record = errors as Record<string, unknown>;
  return {
    fullName: typeof record.fullName === "string" ? record.fullName : undefined,
    email: typeof record.email === "string" ? record.email : undefined,
    form: typeof record.form === "string" ? record.form : undefined,
  };
}

export function RequestAccessForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<FormState>("editing");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setErrors({});
    setFailure("");

    if (!navigator.onLine) {
      setFailure("You’re offline. Reconnect, then retry your request.");
      setState("retry");
      return;
    }

    try {
      const response = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, website }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (response.status === 202) {
        setState("accepted");
        return;
      }

      if (response.status === 400) {
        const nextErrors = responseErrors(payload);
        setErrors(nextErrors);
        setFailure(nextErrors.form ?? "Check the highlighted fields and try again.");
        setState("editing");
        return;
      }

      if (response.status === 429) {
        setFailure("Too many requests were sent. Wait a little, then retry.");
      } else {
        setFailure("Access requests are unavailable right now. Try again shortly.");
      }
      setState("retry");
    } catch {
      setFailure(navigator.onLine
        ? "The request could not be sent. Retry when your connection is stable."
        : "You’re offline. Reconnect, then retry your request.");
      setState("retry");
    }
  }

  if (state === "accepted") {
    return (
      <div
        className={styles.completion}
        aria-label="Request received. We’ll review it and send an invitation email if access is approved."
        aria-live="polite"
      >
        <span className={styles.completionMark} aria-hidden="true">✓</span>
        <h2>Request received.</h2>
        <p>We&rsquo;ll review it and send an invitation email if access is approved.</p>
      </div>
    );
  }

  const submitting = state === "submitting";

  return (
    <form
      className={styles.formStack}
      action="/api/access-requests"
      method="post"
      onSubmit={submit}
      noValidate
    >
      <div className={styles.fieldGroup}>
        <label className={styles.field} htmlFor="request-full-name">
          <span className={styles.fieldLabel}>Full name</span>
        <input
          id="request-full-name"
          name="fullName"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? "request-full-name-error" : undefined}
          disabled={submitting}
        />
        {errors.fullName && <span id="request-full-name-error" className={styles.fieldError}>{errors.fullName}</span>}
        </label>

        <label className={styles.field} htmlFor="request-email">
          <span className={styles.fieldLabel}>Email</span>
        <input
          id="request-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "request-email-error" : undefined}
          disabled={submitting}
        />
        {errors.email && <span id="request-email-error" className={styles.fieldError}>{errors.email}</span>}
        </label>
      </div>

      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="request-website">Website</label>
        <input
          id="request-website"
          name="website"
          type="text"
          autoComplete="off"
          tabIndex={-1}
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      {failure && <p className={styles.alert} role="alert">{failure}</p>}

      <button className={styles.primaryAction} type="submit" disabled={submitting}>
        <span>{submitting ? "Sending request…" : state === "retry" ? "Retry request" : "Request access"}</span>
        <ArrowRightIcon width={17} height={17} aria-hidden="true" />
      </button>
    </form>
  );
}
