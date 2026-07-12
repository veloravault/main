"use client";

import { CheckSquareIcon, ChevronDownIcon, SquareIcon, TrashIcon } from "lucide-react";
import { motion } from "framer-motion";
import { CardNetworkLogo, getCardNetwork } from "@/components/CardLogos";

export interface PaymentCardProps {
  id: string;
  title: string;
  number: string;
  name?: string;
  expiry?: string;
  cvv?: string;
  subtype?: "credit" | "debit";
  colorClass: string;
  selected: boolean;
  selectionMode: boolean;
  expanded: boolean;
  stackIndex: number;
  stacked: boolean;
  active: boolean;
  onSelect: (event: React.MouseEvent) => void;
  onToggle: () => void;
  onDelete: () => void;
  onCopy: (value: string) => void;
}

export function PaymentCard({
  id, title, number, name, expiry, cvv, subtype, colorClass, selected,
  selectionMode, expanded, stackIndex, stacked, active, onSelect, onToggle, onDelete, onCopy,
}: PaymentCardProps) {
  const network = getCardNetwork(number);
  const formattedNumber = number.replace(/(\d{4})/g, "$1 ").trim();

  return (
    <motion.article
      id={`item-${id}`}
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 28, delay: Math.min(stackIndex * 0.035, 0.16) }}
      className={`group relative ${stacked ? "apple-wallet-card-stacked" : ""} ${active ? "apple-wallet-card-active" : ""}`}
    >
      <div
        className={`relative flex aspect-[1.586/1] w-full flex-col justify-between overflow-hidden rounded-[26px] bg-gradient-to-br p-6 text-white shadow-[0_24px_55px_rgba(0,0,0,0.24)] ring-1 ring-white/20 sm:p-7 ${colorClass} ${selectionMode ? "cursor-pointer" : ""}`}
        onClick={selectionMode ? onSelect : undefined}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(255,255,255,.32),transparent_42%)]" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className={selectionMode ? "pl-8" : ""}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">{subtype ?? "payment"} card</p>
            <h3 className="mt-1 text-[19px] font-semibold tracking-[-0.025em] text-white">{title}</h3>
          </div>
          <div className="flex h-10 min-w-[104px] items-start justify-end pr-8">
            <CardNetworkLogo network={network} />
          </div>
        </div>

        {selectionMode && (
          <div className="absolute left-5 top-6 z-20">
            {selected ? <CheckSquareIcon className="h-6 w-6" /> : <SquareIcon className="h-6 w-6 text-white/60" />}
          </div>
        )}

        <div className="relative z-10">
          <button type="button" onClick={(event) => { event.stopPropagation(); onCopy(number); }} className="tabular-nums text-left font-mono text-[20px] tracking-[0.13em] text-white sm:text-[24px]" aria-label="Copy card number">
            {formattedNumber}
          </button>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/55">Cardholder</p>
              <p className="mt-1 truncate text-[14px] font-semibold tracking-wide text-white/90">{name || "Card holder"}</p>
            </div>
            <div className="flex shrink-0 gap-5 text-right">
              <div><p className="text-[9px] uppercase tracking-widest text-white/55">Expires</p><p className="mt-1 font-mono text-[14px] tabular-nums">{expiry || "••/••"}</p></div>
              <button type="button" onClick={(event) => { event.stopPropagation(); if (cvv) onCopy(cvv); }} className="text-right" aria-label="Copy CVV"><p className="text-[9px] uppercase tracking-widest text-white/55">CVV</p><p className="mt-1 font-mono text-[14px] tabular-nums">•••</p></button>
            </div>
          </div>
        </div>

        <button type="button" onClick={(event) => { event.stopPropagation(); onDelete(); }} className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white/80 opacity-0 backdrop-blur-md transition-opacity hover:bg-red-500 group-hover:opacity-100 focus:opacity-100" aria-label={`Delete ${title}`}><TrashIcon className="h-4 w-4" /></button>
      </div>

      <button type="button" onClick={onToggle} className="apple-group mt-2 flex min-h-11 w-full items-center justify-between px-4 text-[13px] font-semibold text-muted-foreground" aria-expanded={expanded}>
        Card details and PINs
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
    </motion.article>
  );
}
