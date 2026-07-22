import type { ComponentType } from "react";
import { AlertTriangleIcon, ArchiveIcon, LifeBuoyIcon, PaletteIcon, ShieldCheckIcon, SparklesIcon, UserCircleIcon, ScaleIcon } from "lucide-react";

export type SettingsSection = "account" | "plan" | "security" | "appearance" | "backup" | "support" | "danger" | "legal";

export interface SettingsAutoUpgrade {
  plan: "plus";
  period: "monthly" | "yearly";
}

export interface SettingsProps {
  masterPassword: string;
  onLock: () => void;
  initialSection?: SettingsSection;
  /** Bumped each time initialSection is (re-)requested, so navigating to the
   *  same section twice in a row (e.g. clicking "Upgrade plan" again after
   *  manually browsing elsewhere) still re-triggers the jump - Settings is a
   *  long-lived instance (always mounted, just hidden), so a prop value that
   *  happens to repeat wouldn't otherwise re-fire the sync effect. */
  sectionRequestId?: number;
  autoUpgrade?: SettingsAutoUpgrade | null;
}

export interface SettingsSectionMeta {
  id: SettingsSection;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  destructive?: boolean;
}

export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  { id: "account", label: "Account", description: "Photo, name and email", icon: UserCircleIcon },
  { id: "plan", label: "Plan & usage", description: "Your tier, storage and AI usage", icon: SparklesIcon },
  { id: "security", label: "Security", description: "Unlock, sessions and clipboard", icon: ShieldCheckIcon },
  { id: "appearance", label: "Appearance", description: "System, Light or Dark", icon: PaletteIcon },
  { id: "backup", label: "Data & Backup", description: "Encrypted export and vault data", icon: ArchiveIcon },
  { id: "support", label: "Support", description: "Get help from the vault owner", icon: LifeBuoyIcon },
  { id: "legal", label: "Legal & Privacy", description: "Terms, Privacy Policy, and Compliance", icon: ScaleIcon },
  { id: "danger", label: "Danger Zone", description: "Destructive account actions", icon: AlertTriangleIcon, destructive: true },
];
