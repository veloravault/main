"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon, PencilIcon, TrashIcon, XIcon } from "lucide-react";
import { CardNetworkLogo, getCardNetwork } from "@/components/CardLogos";

export interface WalletCardDetailsProps {
  title: string;
  number: string;
  name?: string;
  expiry?: string;
  cvv?: string;
  pin?: string;
  upiPin?: string;
  extraDetails?: string;
  onCopy: (value: string, label: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose?: () => void;
}

export function WalletCardDetails(props: WalletCardDetailsProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (value: string, label: string) => {
    props.onCopy(value, label);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1200);
  };

  const secureRows = [
    ["CVV", props.cvv], ["Card PIN", props.pin], ["UPI PIN", props.upiPin],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <section className="wallet-details" aria-label={`${props.title} details`}>
      <header className="wallet-details-header">
        <div><p className="type-group-label">Selected card</p><h3>{props.title}</h3></div>
        <CardNetworkLogo network={getCardNetwork(props.number)} className="text-foreground" />
        {props.onClose && <button type="button" onClick={props.onClose} aria-label="Close card details"><XIcon /></button>}
      </header>
      <div className="wallet-details-body">
        <dl className="wallet-details-list">
          <div><dt>Card number</dt><dd><span>{props.number.replace(/(\d{4})/g, "$1 ").trim()}</span><button type="button" onClick={() => copy(props.number, "Card number")}><CopyIcon />{copied === "Card number" ? "Copied" : "Copy"}</button></dd></div>
          <div className="wallet-details-pair"><div><dt>Cardholder</dt><dd>{props.name || "Card holder"}</dd></div><div><dt>Expires</dt><dd>{props.expiry || "••/••"}</dd></div></div>
        </dl>
        {secureRows.length > 0 && <div className="wallet-secure"><button type="button" onClick={() => setRevealed((value) => !value)}>{revealed ? <EyeOffIcon /> : <EyeIcon />}{revealed ? "Hide secure details" : "Show secure details"}</button>{secureRows.map(([label, value]) => <div key={label}><span>{label}</span><code>{revealed ? value : "••••"}</code><button type="button" onClick={() => copy(value, label)} aria-label={`Copy ${label}`}>{copied === label ? <CheckIcon /> : <CopyIcon />}</button></div>)}</div>}
        {props.extraDetails && <div className="wallet-extra"><p className="type-group-label">Additional information</p><p>{props.extraDetails}</p></div>}
        <div className="wallet-actions">
          <button type="button" className="wallet-edit" onClick={props.onEdit}><PencilIcon />Edit card</button>
          <button type="button" className="wallet-delete" onClick={props.onDelete}><TrashIcon />Delete card</button>
        </div>
      </div>
    </section>
  );
}
