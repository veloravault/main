"use client";

import {
  ActivityIcon,
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
  { id: "members", label: "Members", description: "Vault access", icon: UsersIcon },
  { id: "activity", label: "Activity", description: "Owner actions", icon: ActivityIcon },
];

export function AdminSidebar(props: {
  activeView: AdminView;
  onSelect: (view: AdminView) => void;
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
      <p className={styles.sidebarFoot}>Revoking a member&rsquo;s access is permanent.</p>
    </aside>
  );
}
