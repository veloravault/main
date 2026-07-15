"use client";

import { useState } from "react";
import { ChevronLeftIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { SettingsNavigation } from "@/components/settings/SettingsNavigation";
import { SETTINGS_SECTIONS, type SettingsProps, type SettingsSection } from "@/components/settings/settings-types";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { BackupSettings } from "@/components/settings/BackupSettings";
import { LegalSettings } from "@/components/settings/LegalSettings";
import { DangerSettings } from "@/components/settings/DangerSettings";

export function Settings({ masterPassword, onLock }: SettingsProps) {
  const [selected, setSelected] = useState<SettingsSection | null>(null);
  const active = selected ?? "account";
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
