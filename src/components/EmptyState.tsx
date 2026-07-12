"use client";
import { motion } from "framer-motion";
import { KeyRoundIcon, FileTextIcon, FileIcon, CreditCardIcon } from "lucide-react";

type VaultType = "passwords" | "documents" | "notes" | "wallet";

const CONFIG = {
  passwords: {
    icon: KeyRoundIcon,
    title: "No Passwords",
    subtitle: "Saved passwords will appear here.",
    cta: "Add Password",
  },
  documents: {
    icon: FileTextIcon,
    title: "No Documents",
    subtitle: "Encrypted documents will appear here.",
    cta: "Upload Document",
  },
  notes: {
    icon: FileIcon,
    title: "No Notes",
    subtitle: "Secure notes will appear here.",
    cta: "Create Note",
  },
  wallet: {
    icon: CreditCardIcon,
    title: "No Cards",
    subtitle: "Saved cards and bank accounts will appear here.",
    cta: "Add Card",
  },
};

interface EmptyStateProps {
  type: VaultType;
  onCta?: () => void;
}

export function EmptyState({ type, onCta }: EmptyStateProps) {
  const cfg = CONFIG[type];
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center py-24 text-center px-6"
    >
      {/* SF Symbol-style icon — muted, single-weight */}
      <div className="w-16 h-16 flex items-center justify-center mb-4">
        <Icon className="w-12 h-12 text-muted-foreground/40" strokeWidth={1} />
      </div>

      <h3 className="text-[19px] font-semibold text-foreground mb-1.5 tracking-tight">
        {cfg.title}
      </h3>
      <p className="text-[15px] text-muted-foreground max-w-[240px] leading-relaxed mb-6">
        {cfg.subtitle}
      </p>

      {onCta && (
        <button
          onClick={onCta}
          className="text-[15px] font-semibold text-primary hover:opacity-75 transition-opacity"
        >
          {cfg.cta}
        </button>
      )}
    </motion.div>
  );
}
