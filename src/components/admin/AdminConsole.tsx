"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ActivityIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  LockKeyholeIcon,
  SearchIcon,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { StateView } from "@/components/ui/state-view";
import { AdminSidebar } from "./AdminSidebar";
import { AdminSkeleton } from "./AdminSkeleton";
import { ApprovalSheet } from "./ApprovalSheet";
import { RequestQueue } from "./RequestQueue";
import { normalizeAdminSearch } from "./admin-client";
import {
  isAccessRequest,
  type AdminAccessRequest,
  type AdminMember,
  type AdminRecord,
  type AdminView,
  type MemberFilter,
  type PendingFilter,
} from "./types";
import styles from "@/app/admin/admin.module.css";

const ADMIN_VIEWS: readonly AdminView[] = ["pending", "invited", "members", "activity"];
const PENDING_FILTERS: readonly PendingFilter[] = ["pending", "inviting", "invite_failed"];
const MEMBER_FILTERS: readonly MemberFilter[] = ["all", "invited", "active", "suspended", "revoked"];
const VIEW_LABELS: Record<AdminView, string> = { pending: "Pending", invited: "Invited", members: "Members", activity: "Activity" };

const TITLES: Record<AdminView, { eyebrow: string; title: string; description: string }> = {
  pending: { eyebrow: "Invitation review", title: "Access, considered.", description: "Review each person before an account invitation leaves the vault." },
  invited: { eyebrow: "Invitations", title: "Invited people", description: "A record of invitations confirmed by the server." },
  members: { eyebrow: "Vault membership", title: "Members", description: "People whose invitation has entered the vault access lifecycle." },
  activity: { eyebrow: "Owner record", title: "Activity", description: "A calm record of access decisions made from this console." },
};

function isAdminView(value: string | null): value is AdminView {
  return ADMIN_VIEWS.includes(value as AdminView);
}

function isPendingFilter(value: string | null): value is PendingFilter {
  return PENDING_FILTERS.includes(value as PendingFilter);
}

function isMemberFilter(value: string | null): value is MemberFilter {
  return MEMBER_FILTERS.includes(value as MemberFilter);
}

function safePage(value: unknown): { items: AdminRecord[]; nextCursor: string | null } {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) {
    throw new Error("INVALID_ADMIN_RESPONSE");
  }
  const nextCursor = "nextCursor" in value && typeof value.nextCursor === "string" ? value.nextCursor : null;
  return { items: value.items as AdminRecord[], nextCursor };
}

function memberDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function MemberQueue(props: { items: AdminMember[]; searchActive: boolean; error: string | null; onRetry: () => void }) {
  if (props.error) return <StateView kind="error" title="Members unavailable" description={props.error} action={{ label: "Try again", onClick: props.onRetry }} />;
  if (props.items.length === 0) {
    return <StateView kind="empty" title={props.searchActive ? "No matching members" : "No members in this view"} description={props.searchActive ? "Try a different email address." : "Membership changes will appear here."} />;
  }
  return (
    <div className={styles.memberList} role="list" aria-label="Vault members">
      {props.items.map((member) => (
        <article className={styles.memberRow} key={member.id} role="listitem">
          <span className={styles.memberGlyph}><LockKeyholeIcon aria-hidden="true" /></span>
          <span className={styles.memberIdentity}><strong>{member.email}</strong><small>Approved {memberDate(member.approvedAt)}</small></span>
          <span className={styles.memberStatus} data-status={member.status}>{member.status}</span>
        </article>
      ))}
    </div>
  );
}

export function AdminConsole({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const view = isAdminView(searchParams.get("view")) ? searchParams.get("view") as AdminView : "pending";
  const pendingFilter = isPendingFilter(searchParams.get("status")) ? searchParams.get("status") as PendingFilter : "pending";
  const memberFilter = isMemberFilter(searchParams.get("status")) ? searchParams.get("status") as MemberFilter : "all";
  const rawUrlSearch = searchParams.get("search") ?? "";
  const urlSearch = normalizeAdminSearch(rawUrlSearch);
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [items, setItems] = useState<AdminRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(view !== "activity");
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appendError, setAppendError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminAccessRequest | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const pendingUrlSearchRef = useRef<string | null>(null);
  const queryGenerationRef = useRef(0);
  const requestControllersRef = useRef<Set<AbortController>>(new Set());

  const updateUrl = useCallback((updates: Record<string, string | null>, history: "push" | "replace" = "replace") => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    if (history === "push") router.push(href, { scroll: false });
    else router.replace(href, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (rawUrlSearch !== urlSearch) {
        pendingUrlSearchRef.current = urlSearch;
        updateUrl({ search: urlSearch || null, cursor: null }, "replace");
        return;
      }
      if (pendingUrlSearchRef.current !== null) {
        if (urlSearch === pendingUrlSearchRef.current) pendingUrlSearchRef.current = null;
        return;
      }
      if (urlSearch !== searchQuery) {
        setSearchInput(urlSearch);
        setSearchQuery(urlSearch);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [rawUrlSearch, searchQuery, updateUrl, urlSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalized = normalizeAdminSearch(searchInput);
      if (normalized === searchQuery) return;
      pendingUrlSearchRef.current = normalized;
      if (searchInput !== normalized) setSearchInput(normalized);
      setSearchQuery(normalized);
      updateUrl({ search: normalized || null, cursor: null }, "replace");
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput, searchQuery, updateUrl]);

  const loadPage = useCallback(async (cursor: string | null, append: boolean, generation = queryGenerationRef.current) => {
    if (view === "activity") {
      if (generation !== queryGenerationRef.current) return;
      setItems([]);
      setNextCursor(null);
      setLoading(false);
      setError(null);
      setAppendError(null);
      return;
    }

    const controller = new AbortController();
    requestControllersRef.current.add(controller);
    if (append) {
      setLoadingMore(true);
      setAppendError(null);
    } else {
      setLoading(true);
      setError(null);
      setAppendError(null);
    }
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (cursor) params.set("cursor", cursor);
      const endpoint = view === "members" ? "/api/admin/members" : "/api/admin/access-requests";
      if (view === "pending") params.set("status", pendingFilter);
      if (view === "invited") params.set("status", "invited");
      if (view === "members" && memberFilter !== "all") params.set("status", memberFilter);

      const response = await fetch(`${endpoint}?${params}`, { signal: controller.signal, headers: { accept: "application/json" } });
      if (response.status === 401) {
        if (generation !== queryGenerationRef.current || controller.signal.aborted) return;
        setItems([]);
        setNextCursor(null);
        setSelected(null);
        setError(null);
        setAppendError(null);
        setAnnouncement("Your owner session expired. Sign in again.");
        router.replace("/login?next=/admin");
        return;
      }
      if (response.status === 403) {
        if (generation !== queryGenerationRef.current || controller.signal.aborted) return;
        setItems([]);
        setNextCursor(null);
        setSelected(null);
        setAppendError(null);
        setError("This account no longer has access to the owner console.");
        setAnnouncement("Owner access could not be verified.");
        router.refresh();
        return;
      }
      if (!response.ok) throw new Error("ADMIN_LIST_FAILED");
      const page = safePage(await response.json());
      if (generation !== queryGenerationRef.current || controller.signal.aborted) return;
      setItems((current) => append ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch (caught) {
      if (controller.signal.aborted || generation !== queryGenerationRef.current || (caught instanceof DOMException && caught.name === "AbortError")) return;
      const message = "The console could not load this view. Check the connection and try again.";
      if (append) setAppendError(message);
      else {
        setError(message);
        setItems([]);
      }
    } finally {
      requestControllersRef.current.delete(controller);
      if (generation !== queryGenerationRef.current) return;
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [memberFilter, pendingFilter, router, searchQuery, view]);

  useEffect(() => {
    const generation = ++queryGenerationRef.current;
    const controllers = requestControllersRef.current;
    for (const controller of controllers) controller.abort();
    controllers.clear();
    const timer = window.setTimeout(() => {
      setLoadingMore(false);
      void loadPage(null, false, generation);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      for (const controller of controllers) controller.abort();
      controllers.clear();
    };
  }, [loadPage]);

  const selectView = (nextView: AdminView) => {
    const status = nextView === "pending" ? "pending" : null;
    updateUrl({ view: nextView === "pending" ? null : nextView, status, cursor: null }, "push");
  };

  const openApproval = (request: AdminAccessRequest, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    setSelected(request);
  };

  const closeApproval = () => {
    setSelected(null);
    window.requestAnimationFrame(() => {
      if (triggerRef.current?.isConnected) triggerRef.current.focus();
      else headingRef.current?.focus();
    });
  };

  const reconcileInvitationState = useCallback(async () => {
    await loadPage(null, false, queryGenerationRef.current);
  }, [loadPage]);

  const sendInvitation = async () => {
    if (!selected || sendingId) return;
    const target = selected;
    const retry = target.status === "invite_failed";
    setSendingId(target.id);
    setAnnouncement(`Sending invitation to ${target.fullName}.`);
    try {
      const endpoint = `/api/admin/access-requests/${encodeURIComponent(target.id)}/${retry ? "retry" : "approve"}`;
      const response = await fetch(endpoint, { method: "POST", headers: { accept: "application/json" } });
      const body: unknown = await response.json().catch(() => null);
      const result = body && typeof body === "object" ? body as Record<string, unknown> : {};

      if (response.ok && result.status === "invited") {
        setItems((current) => current.map((item) => item.id === target.id && isAccessRequest(item)
          ? { ...item, status: "invited", invitedAt: new Date().toISOString(), lastErrorCode: null }
          : item));
        setAnnouncement(`Invitation sent to ${target.fullName}.`);
        toast({ message: `Invitation sent to ${target.fullName}.`, type: "success" });
      } else if (response.status === 409 && result.status === "already_processing") {
        setItems((current) => current.map((item) => item.id === target.id && isAccessRequest(item) ? { ...item, status: "inviting" } : item));
        setAnnouncement(`Invitation to ${target.fullName} is already sending.`);
        toast({ message: "This invitation is already being sent.", type: "info" });
      } else if (response.status === 502 && result.status === "invite_failed") {
        const safeCode = typeof result.errorCode === "string" ? result.errorCode : "DELIVERY_FAILED";
        setItems((current) => current.map((item) => item.id === target.id && isAccessRequest(item)
          ? { ...item, status: "invite_failed", lastErrorCode: safeCode as AdminAccessRequest["lastErrorCode"] }
          : item));
        setAnnouncement(`Invitation failed for ${target.fullName}. Retry is available.`);
        toast({ message: "The invitation was not confirmed. Retry is available.", type: "error" });
      } else if (response.status === 401) {
        setItems([]);
        setAnnouncement("Your owner session expired. Sign in again.");
        toast({ message: "Your owner session expired. Sign in again.", type: "error" });
        router.replace("/login?next=/admin");
      } else if (response.status === 403) {
        setItems([]);
        setError("This account no longer has access to the owner console.");
        setAnnouncement("Owner access could not be verified.");
        toast({ message: "Owner access could not be verified.", type: "error" });
        router.refresh();
      } else if (response.status === 404) {
        setAnnouncement(`${target.fullName} is no longer in this queue.`);
        toast({ message: "This request is no longer available. The queue was refreshed.", type: "info" });
        await reconcileInvitationState();
      } else {
        setAnnouncement(`The invitation state for ${target.fullName} is being refreshed.`);
        toast({ message: "The result could not be confirmed. The queue was refreshed.", type: "info" });
        await reconcileInvitationState();
      }
    } catch {
      setAnnouncement(`The invitation state for ${target.fullName} is being refreshed.`);
      toast({ message: "The connection dropped before confirmation. The queue was refreshed.", type: "info" });
      await reconcileInvitationState();
    } finally {
      setSendingId(null);
      closeApproval();
    }
  };

  const requestItems = items.filter(isAccessRequest);
  const memberItems = items.filter((item): item is AdminMember => !isAccessRequest(item));
  const title = TITLES[view];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <AdminSidebar activeView={view} onSelect={selectView} />
        <section className={styles.workspace}>
          <header className={styles.topbar}>
            <div className={styles.mobileBrand}><span aria-hidden="true"><i /><i /><i /><i /><b /></span><strong>Owner console</strong></div>
            <label className={styles.search}>
              <SearchIcon aria-hidden="true" />
              <span className="sr-only">Search this view</span>
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name or email" maxLength={100} />
              <kbd>⌘ K</kbd>
            </label>
            <div className={styles.adminIdentity}><span>{adminEmail.slice(0, 1).toUpperCase()}</span><div><small>Verified owner</small><strong>{adminEmail}</strong></div></div>
          </header>

          <nav className={styles.mobileNav} aria-label="Access console sections">
            {ADMIN_VIEWS.map((item) => <button type="button" key={item} aria-current={view === item ? "page" : undefined} data-active={view === item || undefined} onClick={() => selectView(item)}>{VIEW_LABELS[item]}</button>)}
          </nav>

          <div className={styles.content}>
            <div className={styles.heading}>
              <div><p className={styles.eyebrow}>{title.eyebrow}</p><h1 ref={headingRef} tabIndex={-1}>{title.title}</h1><p>{title.description}</p></div>
              <span className={styles.recordCount}><strong>{items.length}</strong><small>loaded</small></span>
            </div>

            {view === "pending" && (
              <div className={styles.filters} aria-label="Pending request filters">
                {PENDING_FILTERS.map((filter) => (
                  <button key={filter} type="button" aria-pressed={pendingFilter === filter} data-active={pendingFilter === filter || undefined} onClick={() => updateUrl({ status: filter, cursor: null }, "push")}>
                    {filter === "pending" ? "Awaiting review" : filter === "inviting" ? "Sending" : "Needs retry"}
                  </button>
                ))}
              </div>
            )}
            {view === "members" && (
              <label className={styles.memberFilter}>
                <span>Member status</span>
                <select value={memberFilter} onChange={(event) => updateUrl({ status: event.target.value === "all" ? null : event.target.value, cursor: null }, "push")}>
                  {MEMBER_FILTERS.map((filter) => <option key={filter} value={filter}>{filter === "all" ? "All members" : filter[0].toUpperCase() + filter.slice(1)}</option>)}
                </select>
                <ChevronDownIcon aria-hidden="true" />
              </label>
            )}

            <section className={styles.listSurface} aria-label={`${title.eyebrow} content`}>
              {loading ? <AdminSkeleton /> : view === "activity" ? (
                <div className={styles.activityEmpty}>
                  <span><ActivityIcon aria-hidden="true" /></span>
                  <StateView kind="empty" title="No recent activity" description="Owner invitation decisions will be recorded here as the log becomes available." />
                </div>
              ) : view === "members" ? (
                <MemberQueue items={memberItems} searchActive={Boolean(searchQuery)} error={error} onRetry={() => void loadPage(null, false)} />
              ) : (
                <RequestQueue items={requestItems} sendingId={sendingId} searchActive={Boolean(searchQuery)} error={error} onRetryLoad={() => void loadPage(null, false)} onApprove={openApproval} />
              )}
            </section>

            {!loading && !error && !appendError && nextCursor && (
              <button className={styles.loadMore} type="button" disabled={loadingMore} onClick={() => void loadPage(nextCursor, true)}>
                {loadingMore ? "Loading more…" : "Load more"}
                {!loadingMore && <ChevronDownIcon aria-hidden="true" />}
              </button>
            )}
            {!loading && !error && appendError && nextCursor && (
              <div className={styles.appendError} role="alert">
                <span>{appendError}</span>
                <button type="button" onClick={() => void loadPage(nextCursor, true)}>Retry loading more</button>
              </div>
            )}
            {!loading && !error && !nextCursor && items.length > 0 && <p className={styles.endNote}><CheckCircle2Icon aria-hidden="true" />You’re up to date.</p>}
          </div>
        </section>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
      <ApprovalSheet request={selected} open={Boolean(selected)} sending={Boolean(selected && sendingId === selected.id)} onOpenChange={(open) => { if (!open) closeApproval(); }} onConfirm={() => void sendInvitation()} />
    </main>
  );
}
