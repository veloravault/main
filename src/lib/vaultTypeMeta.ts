import {
  KeyRoundIcon,
  FileTextIcon,
  FileIcon,
  CreditCardIcon,
  BuildingIcon,
  TerminalIcon,
  BitcoinIcon,
  KeySquareIcon,
  WifiIcon,
  ShieldEllipsisIcon,
  type LucideIcon,
} from "lucide-react";

export type VaultKind =
  | "passwords"
  | "documents"
  | "notes"
  | "wallet"
  | "banks"
  | "ssh_key"
  | "crypto_wallet"
  | "api_credential"
  | "wifi_credential"
  | "two_factor_backup";

export interface VaultKindMeta {
  icon: LucideIcon;
  label: string;
  /** Flat tinted-badge classes - used by compact chips (e.g. search results). */
  color: string;
  bg: string;
  /** Tailwind gradient classes ("from-X to-Y") for bold list-row icon badges. */
  gradient: string;
}

export const VAULT_TYPE_META: Record<VaultKind, VaultKindMeta> = {
  passwords: { icon: KeyRoundIcon, label: "Password", color: "text-blue-500", bg: "bg-blue-500/10", gradient: "from-blue-400 to-blue-600" },
  documents: { icon: FileTextIcon, label: "Document", color: "text-purple-500", bg: "bg-purple-500/10", gradient: "from-blue-400 to-primary" },
  notes: { icon: FileIcon, label: "Note", color: "text-amber-500", bg: "bg-amber-500/10", gradient: "from-orange-500 to-destructive" },
  wallet: { icon: CreditCardIcon, label: "Wallet", color: "text-emerald-500", bg: "bg-emerald-500/10", gradient: "from-emerald-400 to-emerald-600" },
  banks: { icon: BuildingIcon, label: "Bank Account", color: "text-indigo-500", bg: "bg-indigo-500/10", gradient: "from-indigo-400 to-indigo-600" },
  ssh_key: { icon: TerminalIcon, label: "SSH Key", color: "text-slate-500", bg: "bg-slate-500/10", gradient: "from-slate-400 to-slate-600" },
  crypto_wallet: { icon: BitcoinIcon, label: "Crypto", color: "text-orange-500", bg: "bg-orange-500/10", gradient: "from-orange-400 to-orange-600" },
  api_credential: { icon: KeySquareIcon, label: "API Credential", color: "text-cyan-500", bg: "bg-cyan-500/10", gradient: "from-cyan-400 to-cyan-600" },
  wifi_credential: { icon: WifiIcon, label: "WiFi", color: "text-teal-500", bg: "bg-teal-500/10", gradient: "from-teal-400 to-teal-600" },
  two_factor_backup: { icon: ShieldEllipsisIcon, label: "2FA Backup", color: "text-rose-500", bg: "bg-rose-500/10", gradient: "from-rose-400 to-rose-600" },
};
