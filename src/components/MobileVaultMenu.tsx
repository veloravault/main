"use client";

import { useState } from "react";
import { BuildingIcon, CheckIcon, ChevronRightIcon, LockIcon, MoreHorizontalIcon, PaletteIcon, SettingsIcon, Wand2Icon } from "lucide-react";
import { AdaptiveSheet, AdaptiveSheetBody } from "@/components/ui/adaptive-sheet";
import type { Theme } from "@/components/ThemeProvider";

type ThemeChoice = Theme;

export function MobileVaultMenu(props: {
  theme: Theme | undefined;
  setTheme: (theme: Theme) => void;
  onNavigateBanks: () => void;
  onNavigateSettings: () => void;
  onMagicImport: () => void;
  onLock: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const activeTheme = (["system", "light", "dark"] as string[]).includes(props.theme ?? "") ? props.theme as ThemeChoice : "system";

  const act = (callback: () => void) => {
    setOpen(false);
    window.setTimeout(callback, 120);
  };

  return (
    <>
      <button type="button" className="vault-header-icon vault-header-more" aria-label="More actions" aria-haspopup="dialog" onClick={() => setOpen(true)}><MoreHorizontalIcon aria-hidden="true" /></button>
      <AdaptiveSheet open={open} onOpenChange={setOpen} title="Vault actions" description="Navigate and control this device." size="sm" className="mobile-vault-menu">
        <AdaptiveSheetBody className="mobile-vault-menu-body">
          <MenuRow icon={BuildingIcon} label="Bank Accounts" detail="Routing and account details" onClick={() => act(props.onNavigateBanks)} />
          <MenuRow icon={SettingsIcon} label="Profile & Settings" detail="Account, security and backup" onClick={() => act(props.onNavigateSettings)} />
          <MenuRow icon={Wand2Icon} label="Magic Import" detail="Review data before saving" onClick={() => act(props.onMagicImport)} />
          <MenuRow icon={PaletteIcon} label="Appearance" detail={activeTheme[0].toUpperCase() + activeTheme.slice(1)} onClick={() => { setOpen(false); window.setTimeout(() => setAppearanceOpen(true), 120); }} />
          <div className="mobile-vault-menu-separator" />
          <MenuRow icon={LockIcon} label="Lock Vault" detail="Keep your account signed in" destructive onClick={() => act(props.onLock)} />
        </AdaptiveSheetBody>
      </AdaptiveSheet>
      <AdaptiveSheet open={appearanceOpen} onOpenChange={setAppearanceOpen} title="Appearance" description="Choose how Velora Vault looks on this device." size="sm" className="mobile-vault-menu">
        <AdaptiveSheetBody className="mobile-vault-menu-body">
          {(["system", "light", "dark"] as ThemeChoice[]).map((choice) => <button key={choice} type="button" className="mobile-vault-theme-row system-interactive" onClick={() => { props.setTheme(choice); setAppearanceOpen(false); }}><span>{choice[0].toUpperCase() + choice.slice(1)}</span>{activeTheme === choice && <CheckIcon aria-hidden="true" />}</button>)}
        </AdaptiveSheetBody>
      </AdaptiveSheet>
    </>
  );
}

function MenuRow(props: { icon: typeof BuildingIcon; label: string; detail: string; destructive?: boolean; onClick: () => void }) {
  const Icon = props.icon;
  return <button type="button" className={`mobile-vault-menu-row system-interactive ${props.destructive ? "is-destructive" : ""}`} onClick={props.onClick}><span><Icon aria-hidden="true" /></span><span><strong>{props.label}</strong><small>{props.detail}</small></span><ChevronRightIcon aria-hidden="true" /></button>;
}
