"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  LockKeyholeIcon,
  LogOutIcon,
  SearchIcon,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { StateView } from "@/components/ui/state-view";
import { AdminSidebar } from "./AdminSidebar";
import { AdminOverview } from "./AdminOverview";
import { AdminMemberDetail } from "./AdminMemberDetail";
import { AdminActivity } from "./AdminActivity";
import { AdminSupport } from "./AdminSupport";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { AdminSkeleton } from "./AdminSkeleton";
import { normalizeAdminSearch } from "./admin-client";
import {
  type AdminMember,
  type AdminView,
  type MemberFilter,
} from "./types";
import styles from "@/app/admin/admin.module.css";
import { VeloraMark } from "@/components/VeloraMark";
import { supabase } from "@/lib/supabase";

const ADMIN_VIEWS: readonly AdminView[] = ["overview", "members", "support", "activity"];
const MEMBER_FILTERS: readonly MemberFilter[] = ["all", "invited", "active", "suspended", "revoked"];
const VIEW_LABELS: Record<AdminView, string> = { overview: "Overview", members: "Members", support: "Support", activity: "Activity" };

const TITLES: Record<AdminView, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "Owner operations", title: "Overview", description: "Membership, support, usage, and recent access decisions at a glance." },
  members: { eyebrow: "Vault membership", title: "Members", description: "Everyone with an account, and their current vault access." },
  support: { eyebrow: "Member requests", title: "Support", description: "Tickets opened by members, and your replies." },
  activity: { eyebrow: "Owner record", title: "Activity", description: "A calm record of access decisions made from this console." },
};

function isAdminView(value: string | null): value is AdminView {
  return ADMIN_VIEWS.includes(value as AdminView);
}

function isMemberFilter(value: string | null): value is MemberFilter {
  return MEMBER_FILTERS.includes(value as MemberFilter);
}

function safePage(value: unknown): { items: AdminMember[]; nextCursor: string | null } {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) {
    throw new Error("INVALID_ADMIN_RESPONSE");
  }
  const nextCursor = "nextCursor" in value && typeof value.nextCursor === "string" ? value.nextCursor : null;
  return { items: value.items as AdminMember[], nextCursor };
}

function memberDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function MemberQueue(props: {
  items: AdminMember[];
  searchActive: boolean;
  error: string | null;
  mutatingId: string | null;
  onRetry: () => void;
  onMutate: (member: AdminMember, status: "active" | "suspended" | "revoked") => void;
  onSelectMember: (member: AdminMember) => void;
}) {
  if (props.error) return <StateView kind="error" title="Members unavailable" description={props.error} action={{ label: "Try again", onClick: props.onRetry }} />;
  if (props.items.length === 0) {
    return <StateView kind="empty" title={props.searchActive ? "No matching members" : "No members in this view"} description={props.searchActive ? "Try a different email address." : "New accounts will appear here as people join."} />;
  }
  return (
    <div className={styles.memberList} role="list" aria-label="Vault members">
      {props.items.map((member) => {
        const mutating = props.mutatingId === member.id;
        const canSuspend = !member.isOwner && (member.status === "invited" || member.status === "active");
        const canRestore = !member.isOwner && member.status === "suspended";
        const canRevoke = !member.isOwner && member.status !== "revoked";
        return (
          <article className={styles.memberRow} key={member.id} role="listitem">
            <span className={styles.memberGlyph}><LockKeyholeIcon aria-hidden="true" /></span>
            <button className={styles.memberIdentity} type="button" onClick={() => props.onSelectMember(member)} aria-label={`View details for ${member.email}`}><strong>{member.email}</strong><small>Joined {memberDate(member.approvedAt)} · {member.plan === "plus" ? "Plus" : "Free"} plan{member.isOwner ? " · Owner" : ""}</small></button>
            <span className={styles.memberActions}>
              <span className={styles.memberStatus} data-status={member.status}>{member.status}</span>
              {canRestore && (
                <button type="button" disabled={mutating} onClick={() => props.onMutate(member, "active")}>
                  Restore access
                </button>
              )}
              {canSuspend && (
                <button type="button" disabled={mutating} onClick={() => props.onMutate(member, "suspended")}>
                  Block access
                </button>
              )}
              {canRevoke && (
                <button type="button" disabled={mutating} data-destructive onClick={() => props.onMutate(member, "revoked")}>
                  Revoke
                </button>
              )}
            </span>
          </article>
        );
      })}
    </div>
  );
}

export function AdminConsole({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const view = isAdminView(searchParams.get("view")) ? searchParams.get("view") as AdminView : "overview";
  const memberFilter = isMemberFilter(searchParams.get("status")) ? searchParams.get("status") as MemberFilter : "all";
  const rawUrlSearch = searchParams.get("search") ?? "";
  const urlSearch = normalizeAdminSearch(rawUrlSearch);
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [items, setItems] = useState<AdminMember[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(view === "members");
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appendError, setAppendError] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [pendingMutation, setPendingMutation] = useState<{ member: AdminMember; status: "active" | "suspended" | "revoked" } | null>(null);
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const pendingUrlSearchRef = useRef<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const queryGenerationRef = useRef(0);
  const requestControllersRef = useRef<Set<AbortController>>(new Set());
  const retriedGenerationsRef = useRef<Set<number>>(new Set());
  const loadPageRef = useRef<((cursor: string | null, append: boolean, generation?: number) => Promise<void>) | null>(null);

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

  useEffect(() => {
    if (view !== "members") return;
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, [view]);

  const loadPage = useCallback(async (cursor: string | null, append: boolean, generation = queryGenerationRef.current) => {
    if (view !== "members") {
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
      if (memberFilter !== "all") params.set("status", memberFilter);

      const response = await fetch(`/api/admin/members?${params}`, { signal: controller.signal, headers: { accept: "application/json" } });
      if (response.status === 401) {
        if (generation !== queryGenerationRef.current || controller.signal.aborted) return;
        setItems([]);
        setNextCursor(null);
        setError(null);
        setAppendError(null);
        setAnnouncement("Your owner session expired. Sign in again.");
        router.replace("/login?next=/admin");
        return;
      }
      if (response.status === 403) {
        if (generation !== queryGenerationRef.current || controller.signal.aborted) return;
        // The server just rendered this page for an account it recognized as
        // the owner, so a 403 moments later on the same session is more
        // likely a transient auth-refresh race (Supabase refresh tokens are
        // single-use; a page load immediately followed by this fetch can
        // collide) than an actual permission change. Retry once before
        // surfacing a terminal error.
        if (!retriedGenerationsRef.current.has(generation)) {
          retriedGenerationsRef.current.add(generation);
          window.setTimeout(() => {
            if (generation === queryGenerationRef.current) void loadPageRef.current?.(cursor, append, generation);
          }, 800);
          return;
        }
        setItems([]);
        setNextCursor(null);
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
  }, [memberFilter, router, searchQuery, view]);

  useEffect(() => {
    loadPageRef.current = loadPage;
  }, [loadPage]);

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
    updateUrl({
      view: nextView === "overview" ? null : nextView,
      status: null,
      cursor: null,
      ticket: null,
      category: null,
      result: null,
      search: null,
    }, "push");
  };

  const navigateFromOverview = (nextView: AdminView, params: Record<string, string> = {}) => {
    updateUrl({
      view: nextView,
      status: null,
      cursor: null,
      ticket: null,
      category: null,
      result: null,
      search: null,
      ...params,
    }, "push");
  };

  const mutateMember = async (member: AdminMember, status: "active" | "suspended" | "revoked") => {
    if (mutatingId) return;
    setMutatingId(member.id);
    setAnnouncement(`Updating ${member.email}.`);
    try {
      const response = await fetch(`/api/admin/members/${encodeURIComponent(member.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const body = await response.json().catch(() => null) as { member?: AdminMember } | null;
        setItems((current) => current.map((item) => item.id === member.id && body?.member ? body.member : item));
        if (body?.member) setSelectedMember((current) => current?.id === member.id ? body.member as AdminMember : current);
        const verb = status === "active" ? "restored" : status;
        setAnnouncement(`${member.email} ${verb}.`);
        toast({ message: `${member.email} was ${verb}.`, type: "success" });
      } else if (response.status === 404) {
        setAnnouncement(`${member.email} is no longer in this list.`);
        toast({ message: "This member is no longer available. The list was refreshed.", type: "info" });
        await loadPage(null, false, queryGenerationRef.current);
      } else if (response.status === 409) {
        setAnnouncement(`${member.email}'s status already changed.`);
        toast({ message: "That status change no longer applies. The list was refreshed.", type: "info" });
        await loadPage(null, false, queryGenerationRef.current);
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
      } else {
        setAnnouncement(`${member.email} could not be updated.`);
        toast({ message: "The update could not be confirmed. Try again.", type: "error" });
      }
    } catch {
      setAnnouncement(`The connection dropped before ${member.email} could be updated.`);
      toast({ message: "The connection dropped before confirmation. Try again.", type: "error" });
    } finally {
      setMutatingId(null);
      setPendingMutation(null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const title = TITLES[view];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <AdminSidebar activeView={view} onSelect={selectView} onSignOut={() => void signOut()} />
        <section className={styles.workspace}>
          <header className={styles.topbar}>
            <div className={styles.mobileBrand}><VeloraMark aria-hidden="true" /><strong>Owner console</strong></div>
            {view === "members" ? (
              <label className={styles.search}>
                <SearchIcon aria-hidden="true" />
                <span className="sr-only">Search members</span>
                <input ref={searchRef} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search member email" maxLength={100} />
                <kbd>⌘ K</kbd>
              </label>
            ) : view === "activity" ? <p className={styles.readOnlyNote}>Read-only audit record</p> : view === "overview" ? <p className={styles.readOnlyNote}>Live operations summary</p> : null}
            <div className={styles.adminIdentity}><span>{adminEmail.slice(0, 1).toUpperCase()}</span><div><small>Verified owner</small><strong>{adminEmail}</strong></div></div>
            <button className={styles.mobileSignOut} type="button" aria-label="Sign out" onClick={() => void signOut()}><LogOutIcon aria-hidden="true" /></button>
          </header>

          <nav className={styles.mobileNav} aria-label="Access console sections">
            {ADMIN_VIEWS.map((item) => <button type="button" key={item} aria-current={view === item ? "page" : undefined} data-active={view === item || undefined} onClick={() => selectView(item)}>{VIEW_LABELS[item]}</button>)}
          </nav>

          <div className={styles.content}>
            <div className={styles.heading}>
              <div><p className={styles.eyebrow}>{title.eyebrow}</p><h1 tabIndex={-1}>{title.title}</h1><p>{title.description}</p></div>
              {view === "members" && <span className={styles.recordCount}><strong>{items.length}</strong><small>loaded</small></span>}
            </div>

            {view === "members" && (
              <label className={styles.memberFilter}>
                <span>Member status</span>
                <select value={memberFilter} onChange={(event) => updateUrl({ status: event.target.value === "all" ? null : event.target.value, cursor: null }, "push")}>
                  {MEMBER_FILTERS.map((filter) => <option key={filter} value={filter}>{filter === "all" ? "All members" : filter[0].toUpperCase() + filter.slice(1)}</option>)}
                </select>
                <ChevronDownIcon aria-hidden="true" />
              </label>
            )}

            <section className={view === "overview" ? styles.overviewSurface : styles.listSurface} aria-label={`${title.eyebrow} content`}>
              {view === "overview" ? <AdminOverview onNavigate={navigateFromOverview} /> : view === "activity" ? <AdminActivity /> : view === "support" ? <AdminSupport /> : loading ? <AdminSkeleton /> : (
                <MemberQueue
                  items={items}
                  searchActive={Boolean(searchQuery)}
                  error={error}
                  mutatingId={mutatingId}
                  onRetry={() => void loadPage(null, false)}
                  onMutate={(member, status) => setPendingMutation({ member, status })}
                  onSelectMember={setSelectedMember}
                />
              )}
            </section>

            {view === "members" && !loading && !error && !appendError && nextCursor && (
              <button className={styles.loadMore} type="button" disabled={loadingMore} onClick={() => void loadPage(nextCursor, true)}>
                {loadingMore ? "Loading more…" : "Load more"}
                {!loadingMore && <ChevronDownIcon aria-hidden="true" />}
              </button>
            )}
            {view === "members" && !loading && !error && appendError && nextCursor && (
              <div className={styles.appendError} role="alert">
                <span>{appendError}</span>
                <button type="button" onClick={() => void loadPage(nextCursor, true)}>Retry loading more</button>
              </div>
            )}
            {view === "members" && !loading && !error && !nextCursor && items.length > 0 && <p className={styles.endNote}><CheckCircle2Icon aria-hidden="true" />You’re up to date.</p>}
          </div>
        </section>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
      {selectedMember && (
        <AdminMemberDetail
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onRequestStatus={(member, status) => setPendingMutation({ member, status })}
        />
      )}
      <AdminConfirmDialog
        open={Boolean(pendingMutation)}
        title={
          pendingMutation?.status === "revoked" ? "Permanently revoke access?"
          : pendingMutation?.status === "active" ? "Restore this member’s access?"
          : "Block this member’s access?"
        }
        description={
          pendingMutation?.status === "revoked" ? `${pendingMutation.member.email} will permanently lose access to this vault. This cannot be reversed.`
          : pendingMutation?.status === "active" ? `${pendingMutation?.member.email ?? "This member"} will regain vault access immediately.`
          : `${pendingMutation?.member.email ?? "This member"} will lose vault access. Use Restore access to reinstate them later.`
        }
        confirmLabel={
          pendingMutation?.status === "revoked" ? "Revoke access"
          : pendingMutation?.status === "active" ? "Restore access"
          : "Block access"
        }
        destructive={pendingMutation?.status !== "active"}
        busy={Boolean(mutatingId)}
        onCancel={() => setPendingMutation(null)}
        onConfirm={() => {
          if (pendingMutation) void mutateMember(pendingMutation.member, pendingMutation.status);
        }}
      />
    </main>
  );
}
