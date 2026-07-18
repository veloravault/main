"use client";

import { useEffect, useState } from "react";
import {
  BotIcon,
  DatabaseIcon,
  FileTextIcon,
  KeyRoundIcon,
  LifeBuoyIcon,
  MailIcon,
  NotebookIcon,
  ShieldCheckIcon,
  WalletCardsIcon,
  XIcon,
} from "lucide-react";
import type { AdminMember, AdminMemberDetailDto } from "./types";
import styles from "@/app/admin/admin.module.css";

function formatBytes(value: number) {
  if (value < 1_024) return `${value} B`;
  if (value < 1_048_576) return `${(value / 1_024).toFixed(1)} KB`;
  if (value < 1_073_741_824) return `${(value / 1_048_576).toFixed(1)} MB`;
  return `${(value / 1_073_741_824).toFixed(1)} GB`;
}

function formatDate(value: string | null) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function AdminMemberDetail(props: {
  member: AdminMember;
  onClose: () => void;
  onRequestStatus: (member: AdminMember, status: "active" | "suspended" | "revoked") => void;
}) {
  const [detail, setDetail] = useState<AdminMemberDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/members/${encodeURIComponent(props.member.id)}`, { signal: controller.signal, headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("MEMBER_DETAIL_FAILED");
        return response.json() as Promise<{ member: AdminMemberDetailDto }>;
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setDetail(payload.member);
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError("Member details could not be loaded. Close this panel and try again.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [props.member.id, props.member.status]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [props]);

  const sendSetupEmail = async () => {
    if (emailState === "sending") return;
    setEmailState("sending");
    setEmailError(null);
    try {
      const response = await fetch(`/api/admin/members/${encodeURIComponent(props.member.id)}/setup-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: "{}",
      });
      if (response.ok) {
        setEmailState("sent");
        return;
      }
      if (response.status === 429) setEmailError("Supabase is rate limiting setup emails. Try again later.");
      else if (response.status === 409) setEmailError("A setup link is no longer available for this member.");
      else setEmailError("The setup email could not be confirmed. Try again.");
      setEmailState("idle");
    } catch {
      setEmailError("The connection dropped before the email could be confirmed.");
      setEmailState("idle");
    }
  };

  const member = detail ?? props.member;
  const isOwner = detail?.isOwner ?? false;
  const canRestore = member.status === "suspended";
  const canBlock = member.status === "active" || member.status === "invited";
  const canRevoke = member.status !== "revoked";
  const usage = detail?.usage;
  const metrics = usage ? [
    { label: "Passwords", value: usage.passwords, Icon: KeyRoundIcon },
    { label: "Documents", value: usage.documents, Icon: FileTextIcon },
    { label: "Notes", value: usage.notes, Icon: NotebookIcon },
    { label: "Wallet", value: usage.walletRecords, Icon: WalletCardsIcon },
    { label: "Banks", value: usage.bankAccounts, Icon: DatabaseIcon },
    { label: "AI this month", value: usage.aiEventsThisMonth, Icon: BotIcon },
    { label: "Support", value: usage.supportTickets, Icon: LifeBuoyIcon },
    { label: "Storage", value: formatBytes(usage.documentBytes), Icon: DatabaseIcon },
  ] : [];

  return (
    <div className={styles.memberDetailBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose(); }}>
      <section className={styles.memberDetailSheet} role="dialog" aria-modal="true" aria-labelledby="member-detail-title">
        <header className={styles.memberDetailHeader}>
          <div><p className={styles.eyebrow}>{isOwner ? "Configured owner" : "Vault member"}</p><h2 id="member-detail-title">{member.email}</h2></div>
          <button type="button" onClick={props.onClose} aria-label="Close member details"><XIcon aria-hidden="true" /></button>
        </header>

        <div className={styles.memberDetailBody}>
          {loading ? <p className={styles.memberDetailState} role="status">Loading member details…</p> : error ? <p className={styles.memberDetailState} role="alert">{error}</p> : detail ? (
            <>
              <dl className={styles.memberFacts}>
                <div><dt>Status</dt><dd><span className={styles.memberStatus} data-status={detail.status}>{detail.status}</span></dd></div>
                <div><dt>Plan</dt><dd>{detail.plan === "plus" ? "Plus" : "Free"}</dd></div>
                <div><dt>Joined</dt><dd>{formatDate(detail.approvedAt)}</dd></div>
                <div><dt>Activated</dt><dd>{formatDate(detail.activatedAt)}</dd></div>
              </dl>

              <section className={styles.memberUsage} aria-labelledby="member-usage-title">
                <h3 id="member-usage-title">Usage snapshot</h3>
                <div>{metrics.map(({ label, value, Icon }) => <span key={label}><Icon aria-hidden="true" /><small>{label}</small><strong>{value}</strong></span>)}</div>
              </section>

              {isOwner ? (
                <p className={styles.memberOwnerNote}><ShieldCheckIcon aria-hidden="true" />Owner access cannot be changed from this console.</p>
              ) : (
                <section className={styles.memberControls} aria-labelledby="member-controls-title">
                  <h3 id="member-controls-title">Access controls</h3>
                  <div>
                    {canRestore && <button type="button" onClick={() => props.onRequestStatus(member, "active")}>Restore access</button>}
                    {canBlock && <button type="button" onClick={() => props.onRequestStatus(member, "suspended")}>Block access</button>}
                    {canRevoke && <button type="button" data-destructive onClick={() => props.onRequestStatus(member, "revoked")}>Revoke access</button>}
                  </div>
                  {member.status === "invited" && <button className={styles.setupEmailButton} type="button" disabled={emailState !== "idle"} onClick={() => void sendSetupEmail()}><MailIcon aria-hidden="true" />{emailState === "sent" ? "Setup link sent" : emailState === "sending" ? "Sending…" : "Send setup link"}</button>}
                  <p className={styles.memberControlHelp}>Status changes require confirmation. Setup links let invited members choose a sign-in password; vault keys are never emailed.</p>
                  <p className={styles.memberInlineStatus} aria-live="polite">{emailError ?? (emailState === "sent" ? "Supabase accepted the setup email request." : "")}</p>
                </section>
              )}
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
