"use client";

import { useEffect, useState } from "react";
import { ChevronLeftIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { PlanSettings } from "@/components/settings/PlanSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { SettingsNavigation } from "@/components/settings/SettingsNavigation";
import { SETTINGS_SECTIONS, type SettingsProps, type SettingsSection } from "@/components/settings/settings-types";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { BackupSettings } from "@/components/settings/BackupSettings";
import { LegalSettings } from "@/components/settings/LegalSettings";
import { DangerSettings } from "@/components/settings/DangerSettings";

export function Settings({ masterPassword, onLock, initialSection, sectionRequestId, autoUpgrade }: SettingsProps) {
  const [selected, setSelected] = useState<SettingsSection | null>(initialSection ?? null);
  const active = selected ?? "account";

  // Settings is a long-lived instance (VaultApp keeps every tab panel
  // mounted, just hidden) — a later prop update won't re-run the useState
  // initializer above, so an explicit sync is needed for requests to jump to
  // a section (sidebar "Upgrade plan", or a post-onboarding ?upgrade= param)
  // that arrive after Settings has already mounted.
  useEffect(() => {
    if (!initialSection) return;
    queueMicrotask(() => setSelected(initialSection));
  }, [initialSection, sectionRequestId]);
  const meta = SETTINGS_SECTIONS.find((section) => section.id === active)!;

  return (
    <div className={`vault-settings vault-material-scope ${selected ? "has-mobile-selection" : ""}`}>
      <header className="settings-page-header"><p className="type-group-label">Velora Vault</p><h1>Settings</h1><p>Account, security and preferences for this device.</p></header>
      <div className="settings-layout">
        <aside className="settings-sidebar"><SettingsNavigation selected={active} onSelect={setSelected} /></aside>
        <main className="settings-detail overflow-hidden relative">
          <button type="button" className="settings-mobile-back system-interactive" onClick={() => setSelected(null)}><ChevronLeftIcon aria-hidden="true" />Settings</button>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {active === "account" && <AccountSettings />}
              {active === "plan" && <PlanSettings autoUpgrade={autoUpgrade} />}
              {active === "appearance" && <AppearanceSettings />}
              {active === "security" && <SecuritySettings masterPassword={masterPassword} onLock={onLock} />}
              {active === "backup" && <BackupSettings />}
              {active === "legal" && <LegalSettings />}
              {active === "danger" && <DangerSettings masterPassword={masterPassword} />}
            </motion.div>
          </AnimatePresence>
          
          <span className="sr-only">{meta.label}</span>
        </main>
      </div>
    </div>
  );
}
