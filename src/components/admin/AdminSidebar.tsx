"use client";

import {
  ActivityIcon,
  ChartNoAxesCombinedIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  LifeBuoyIcon,
  LogOutIcon,
  MailIcon,
  UsersIcon,
} from "lucide-react";
import type { AdminView } from "./types";
import styles from "@/app/admin/admin.module.css";
import { VeloraMark } from "@/components/VeloraMark";

const NAVIGATION: Array<{
  id: AdminView;
  label: string;
  description: string;
  icon: typeof UsersIcon;
}> = [
  { id: "overview", label: "Overview", description: "Operations", icon: ChartNoAxesCombinedIcon },
  { id: "members", label: "Members", description: "Vault access", icon: UsersIcon },
  { id: "support", label: "Support", description: "Member tickets", icon: LifeBuoyIcon },
  { id: "contact", label: "Contact", description: "Public messages", icon: MailIcon },
  { id: "billing", label: "Billing", description: "Payment reconciliation", icon: CreditCardIcon },
  { id: "activity", label: "Activity", description: "Owner actions", icon: ActivityIcon },
];

export function AdminSidebar(props: {
  activeView: AdminView;
  onSelect: (view: AdminView) => void;
  onSignOut: () => void;
}) {
  return (
    <aside className={styles.sidebar} aria-label="Access console sections">
      <VeloraMark className={styles.sidebarMark} aria-hidden="true" />
      <div className={styles.sidebarIntro}>
        <p>Velora Vault</p>
        <strong>Owner console</strong>
      </div>
      <nav className={styles.sidebarNav}>
        {NAVIGATION.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={styles.sidebarItem}
              data-active={props.activeView === item.id || undefined}
              aria-current={props.activeView === item.id ? "page" : undefined}
              onClick={() => props.onSelect(item.id)}
            >
              <span className={styles.sidebarIcon}><Icon aria-hidden="true" /></span>
              <span><strong>{item.label}</strong><small>{item.description}</small></span>
            </button>
          );
        })}
      </nav>
      <div className={styles.sidebarActions}>
        <a href="/vault"><ExternalLinkIcon aria-hidden="true" />Open vault</a>
        <button type="button" onClick={props.onSignOut}><LogOutIcon aria-hidden="true" />Sign out</button>
      </div>
      <p className={styles.sidebarFoot}>Blocked members can be restored. Revoking access cannot be reversed from this console.</p>
    </aside>
  );
}
