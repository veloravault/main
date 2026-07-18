"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDownIcon, MailIcon } from "lucide-react";

import { StateView } from "@/components/ui/state-view";
import styles from "@/app/admin/admin.module.css";
import { AdminContactDetail } from "./AdminContactDetail";
import { AdminSkeleton } from "./AdminSkeleton";
import type { AdminContactSubmission, ContactSubmissionFilter } from "./types";

const CONTACT_FILTERS: readonly ContactSubmissionFilter[] = ["new", "read", "resolved", "all"];

function isContactFilter(value: string | null): value is ContactSubmissionFilter {
  return CONTACT_FILTERS.includes(value as ContactSubmissionFilter);
}

function safeContactPage(value: unknown): { items: AdminContactSubmission[]; nextCursor: string | null } {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) {
    throw new Error("INVALID_CONTACT_RESPONSE");
  }
  return {
    items: value.items as AdminContactSubmission[],
    nextCursor: "nextCursor" in value && typeof value.nextCursor === "string" ? value.nextCursor : null,
  };
}

function contactTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function filterLabel(filter: ContactSubmissionFilter) {
  return filter === "all" ? "All" : filter[0].toUpperCase() + filter.slice(1);
}

export function AdminContact() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = isContactFilter(searchParams.get("contact")) ? searchParams.get("contact") as ContactSubmissionFilter : "new";
  const [items, setItems] = useState<AdminContactSubmission[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appendError, setAppendError] = useState<string | null>(null);

  const selectFilter = (nextFilter: ContactSubmissionFilter) => {
    const next = new URLSearchParams(searchParams.toString());
    if (nextFilter === "new") next.delete("contact");
    else next.set("contact", nextFilter);
    next.delete("cursor");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
    setActiveId(null);
  };

  const load = useCallback(async (cursor: string | null, append: boolean) => {
    if (append) {
      setLoadingMore(true);
      setAppendError(null);
    } else {
      setLoading(true);
      setError(null);
      setAppendError(null);
    }
    try {
      const params = new URLSearchParams({ filter });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/admin/contact?${params}`, { headers: { accept: "application/json" } });
      if (response.status === 401) { router.replace("/login?next=/admin"); return; }
      if (response.status === 403) {
        setItems([]);
        setNextCursor(null);
        setError("This account no longer has access to the owner console.");
        router.refresh();
        return;
      }
      if (!response.ok) throw new Error("CONTACT_LIST_FAILED");
      const page = safeContactPage(await response.json());
      setItems((current) => append ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch {
      const message = "Contact messages could not be loaded. Check the connection and try again.";
      if (append) setAppendError(message);
      else {
        setItems([]);
        setError(message);
      }
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(null, false); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading && items.length === 0 && !activeId) return <AdminSkeleton />;
  if (error && items.length === 0 && !activeId) {
    return <StateView kind="error" title="Messages unavailable" description={error} action={{ label: "Try again", onClick: () => void load(null, false) }} />;
  }

  return (
    <div className={styles.supportInbox}>
      <div className={styles.ticketFilterRow} role="tablist" aria-label="Contact message status">
        {CONTACT_FILTERS.map((value) => (
          <button key={value} type="button" role="tab" aria-selected={filter === value} data-active={filter === value || undefined} onClick={() => selectFilter(value)}>
            {filterLabel(value)}
          </button>
        ))}
      </div>

      <div className={styles.supportWorkspace} data-thread-open={Boolean(activeId) || undefined}>
        <section className={styles.supportTicketPane} aria-label={`${filterLabel(filter)} contact messages`}>
          {items.length === 0 ? (
            <StateView kind="empty" title="No contact messages" description={filter === "new" ? "New public enquiries will appear here." : "No messages match this filter."} />
          ) : (
            <div className={styles.ticketList} role="list" aria-label="Public contact messages">
              {items.map((submission) => (
                <button key={submission.id} type="button" className={styles.ticketRow} data-active={activeId === submission.id || undefined} onClick={() => setActiveId(submission.id)}>
                  <span className={styles.ticketGlyph} data-needs-reply={submission.status === "new" || undefined}><MailIcon aria-hidden="true" /></span>
                  <span className={styles.ticketCopy}><strong>{submission.subject}</strong><small>{submission.name} · {submission.email}</small></span>
                  <span className={styles.ticketMeta}><span className={styles.ticketStatus} data-status={submission.status}>{submission.status}</span><time dateTime={submission.createdAt}>{contactTime(submission.createdAt)}</time></span>
                </button>
              ))}
            </div>
          )}

          {appendError && <div className={styles.supportListError} role="alert"><span>{appendError}</span><button type="button" onClick={() => nextCursor && void load(nextCursor, true)}>Retry</button></div>}
          {nextCursor && !appendError && <button className={styles.loadMore} type="button" disabled={loadingMore} onClick={() => void load(nextCursor, true)}>{loadingMore ? "Loading more…" : "Load more"}{!loadingMore && <ChevronDownIcon aria-hidden="true" />}</button>}
        </section>

        {activeId ? (
          <AdminContactDetail submissionId={activeId} onClose={() => setActiveId(null)} onChanged={() => void load(null, false)} />
        ) : (
          <div className={styles.supportThreadPlaceholder}><MailIcon aria-hidden="true" /><strong>Select a message</strong><p>The complete enquiry and owner controls will appear here.</p></div>
        )}
      </div>
    </div>
  );
}
