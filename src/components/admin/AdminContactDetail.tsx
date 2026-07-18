"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, MailIcon, RotateCcwIcon, XIcon } from "lucide-react";

import styles from "@/app/admin/admin.module.css";
import type { AdminContactSubmissionDetail, ContactSubmissionStatus } from "./types";

function contactTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

export function AdminContactDetail(props: { submissionId: string; onClose: () => void; onChanged: () => void }) {
  const router = useRouter();
  const [submission, setSubmission] = useState<AdminContactSubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/contact/${encodeURIComponent(props.submissionId)}`, { signal: controller.signal, headers: { accept: "application/json" } })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/login?next=/admin");
          throw new Error("SESSION_EXPIRED");
        }
        if (!response.ok) throw new Error("CONTACT_LOAD_FAILED");
        return response.json() as Promise<{ submission: AdminContactSubmissionDetail }>;
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setSubmission(payload.submission);
        setLoadError(null);
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoadError("This message could not be loaded. Try again.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [props.submissionId, reloadKey, router]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !updating) props.onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [props, updating]);

  async function updateStatus(status: ContactSubmissionStatus) {
    if (!submission || updating || status === submission.status) return;
    setUpdating(true);
    setStatusError(null);
    try {
      const response = await fetch(`/api/admin/contact/${encodeURIComponent(props.submissionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => null) as { submission?: AdminContactSubmissionDetail } | null;
      if (!response.ok || !payload?.submission) {
        if (response.status === 401) router.replace("/login?next=/admin");
        setStatusError("The message status could not be updated. Try again.");
        return;
      }
      setSubmission(payload.submission);
      setAnnouncement(`Message marked ${status}.`);
      props.onChanged();
    } catch {
      setStatusError("The connection dropped before the status could be confirmed.");
    } finally {
      setUpdating(false);
    }
  }

  const replyHref = submission
    ? `mailto:${submission.email}?subject=${encodeURIComponent(`Re: ${submission.subject}`)}`
    : "mailto:";

  return (
    <section className={styles.contactDetail} role="region" aria-label={submission?.subject ? `Contact message: ${submission.subject}` : "Contact message"}>
      <header className={styles.supportThreadHeader}>
        <div><p className={styles.eyebrow}>{submission?.topic ?? "Public enquiry"}</p><h2>{submission?.subject ?? "Contact message"}</h2>{submission && <span className={styles.ticketStatus} data-status={submission.status}>{submission.status}</span>}</div>
        <button type="button" aria-label="Close message" onClick={props.onClose}><XIcon aria-hidden="true" /></button>
      </header>

      {loading ? <p className={styles.supportThreadState} role="status">Loading message…</p> : loadError ? (
        <div className={styles.supportThreadState} role="alert"><p>{loadError}</p><button type="button" onClick={() => { setLoading(true); setLoadError(null); setReloadKey((value) => value + 1); }}>Try again</button></div>
      ) : submission ? (
        <>
          <div className={styles.contactDetailBody}>
            <div className={styles.contactSender}>
              <span><strong>{submission.name}</strong><a href={`mailto:${submission.email}`}>{submission.email}</a></span>
              <time dateTime={submission.createdAt}>{contactTime(submission.createdAt)}</time>
            </div>
            <article className={styles.contactMessage}><p>{submission.message}</p></article>
          </div>
          <footer className={styles.contactActions}>
            <div aria-label="Message status">
              <button type="button" disabled={updating || submission.status === "new"} onClick={() => void updateStatus("new")}><RotateCcwIcon aria-hidden="true" />Mark new</button>
              <button type="button" disabled={updating || submission.status === "read"} onClick={() => void updateStatus("read")}><MailIcon aria-hidden="true" />Mark read</button>
              <button type="button" disabled={updating || submission.status === "resolved"} onClick={() => void updateStatus("resolved")}><CheckCircle2Icon aria-hidden="true" />Resolve</button>
            </div>
            <a href={replyHref}><MailIcon aria-hidden="true" />Reply by email</a>
            {statusError && <p role="alert">{statusError}</p>}
          </footer>
        </>
      ) : null}
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
    </section>
  );
}
