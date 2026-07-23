import {
  TerminalIcon,
  BitcoinIcon,
  KeySquareIcon,
  WifiIcon,
  ShieldEllipsisIcon,
  type LucideIcon,
} from "lucide-react";

export type CredentialFieldType = "text" | "password" | "textarea";

export interface CredentialFieldSchema {
  key: string;
  label: string;
  type: CredentialFieldType;
  required: boolean;
  placeholder?: string;
}

export type CredentialType =
  | "ssh_key"
  | "crypto_wallet"
  | "api_credential"
  | "wifi_credential"
  | "two_factor_backup";

export interface CredentialTypeConfig {
  type: CredentialType;
  label: string;
  itemNoun: string;
  icon: LucideIcon;
  primaryFieldKey: string;
  fields: CredentialFieldSchema[];
}

export const SSH_KEY_CONFIG: CredentialTypeConfig = {
  type: "ssh_key",
  label: "SSH Keys",
  itemNoun: "SSH key",
  icon: TerminalIcon,
  primaryFieldKey: "privateKey",
  fields: [
    { key: "privateKey", label: "Private key", type: "textarea", required: true, placeholder: "-----BEGIN OPENSSH PRIVATE KEY-----" },
    { key: "publicKey", label: "Public key", type: "textarea", required: false, placeholder: "ssh-ed25519 AAAA..." },
    { key: "host", label: "Host", type: "text", required: false, placeholder: "e.g. github.com" },
    { key: "passphrase", label: "Passphrase", type: "password", required: false, placeholder: "If the key itself is passphrase-protected" },
    { key: "notes", label: "Notes", type: "textarea", required: false },
  ],
};

export const CRYPTO_WALLET_CONFIG: CredentialTypeConfig = {
  type: "crypto_wallet",
  label: "Crypto Passphrases",
  itemNoun: "crypto passphrase",
  icon: BitcoinIcon,
  primaryFieldKey: "seedPhrase",
  fields: [
    { key: "seedPhrase", label: "Seed / recovery phrase", type: "textarea", required: true, placeholder: "word1 word2 word3 ..." },
    { key: "walletAddress", label: "Wallet address", type: "text", required: false, placeholder: "0x... or bc1..." },
    { key: "notes", label: "Notes", type: "textarea", required: false },
  ],
};

export const API_CREDENTIAL_CONFIG: CredentialTypeConfig = {
  type: "api_credential",
  label: "API Credentials",
  itemNoun: "API credential",
  icon: KeySquareIcon,
  primaryFieldKey: "apiSecret",
  fields: [
    { key: "serviceName", label: "Service name", type: "text", required: false, placeholder: "e.g. Stripe, AWS" },
    { key: "apiKey", label: "Key", type: "text", required: true, placeholder: "Public key / client ID" },
    { key: "apiSecret", label: "Secret", type: "password", required: false, placeholder: "Secret key / client secret" },
    { key: "notes", label: "Notes", type: "textarea", required: false },
  ],
};

export const WIFI_CREDENTIAL_CONFIG: CredentialTypeConfig = {
  type: "wifi_credential",
  label: "WiFi Passwords",
  itemNoun: "WiFi password",
  icon: WifiIcon,
  primaryFieldKey: "password",
  fields: [
    { key: "networkName", label: "Network name (SSID)", type: "text", required: true, placeholder: "e.g. Home-5G" },
    { key: "password", label: "Password", type: "password", required: true, placeholder: "Network password" },
    { key: "notes", label: "Notes", type: "textarea", required: false },
  ],
};

export const TWO_FACTOR_BACKUP_CONFIG: CredentialTypeConfig = {
  type: "two_factor_backup",
  label: "2FA Backup Codes",
  itemNoun: "2FA backup code set",
  icon: ShieldEllipsisIcon,
  primaryFieldKey: "codes",
  fields: [
    { key: "serviceName", label: "Service name", type: "text", required: false, placeholder: "e.g. GitHub, Google" },
    { key: "codes", label: "Backup codes", type: "textarea", required: true, placeholder: "One code per line" },
    { key: "notes", label: "Notes", type: "textarea", required: false },
  ],
};

export const CREDENTIAL_TYPE_CONFIGS: CredentialTypeConfig[] = [
  SSH_KEY_CONFIG,
  CRYPTO_WALLET_CONFIG,
  API_CREDENTIAL_CONFIG,
  WIFI_CREDENTIAL_CONFIG,
  TWO_FACTOR_BACKUP_CONFIG,
];
