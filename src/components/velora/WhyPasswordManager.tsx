"use client";

import { useState } from "react";
import { ChevronDownIcon, ShieldCheckIcon } from "lucide-react";
import shared from "@/app/velora/velora.module.css";
import styles from "./WhyPasswordManager.module.css";

const REASONS = [
  {
    title: "Protect every account",
    body: "Weak and reused passwords make one breach much more damaging. A password manager helps every account use a strong, unique credential.",
  },
  {
    title: "Sign in without the busywork",
    body: "Keep the details you need together so you spend less time recovering accounts, copying credentials, or searching through scattered notes.",
  },
  {
    title: "Keep private details organized",
    body: "Passwords, documents, cards, and secure notes stay in one encrypted workspace instead of being spread across browsers and devices.",
  },
] as const;

export function WhyPasswordManager() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className={`${shared.section} ${styles.section}`} aria-labelledby="why-password-manager-title">
      <div className={shared.container}>
        <h2 id="why-password-manager-title" className={`${shared.h2} ${styles.title}`}>
          Why you need a password manager
        </h2>

        <div className={styles.layout}>
          <div className={styles.accordion}>
            {REASONS.map((reason, index) => {
              const open = openIndex === index;
              const panelId = `password-manager-reason-${index}`;
              return (
                <div className={styles.item} data-open={open} key={reason.title}>
                  <button
                    type="button"
                    aria-expanded={openIndex === index}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(open ? -1 : index)}
                  >
                    <span>{reason.title}</span>
                    <ChevronDownIcon aria-hidden="true" />
                  </button>
                  {open && <p id={panelId}>{reason.body}</p>}
                </div>
              );
            })}
          </div>

          <div className={styles.visual} role="img" aria-label="Placeholder visual for password manager education">
            <div className={styles.browserBar}><i /><i /><i /></div>
            <div className={styles.visualBody}>
              <ShieldCheckIcon aria-hidden="true" />
              <strong>Placeholder visual</strong>
              <span>Final product illustration will be added here.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
