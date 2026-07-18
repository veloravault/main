"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

const CONSENT_KEY = "velora-analytics-consent";
const GA_MEASUREMENT_ID = "G-GKGJ4QD0E5";

type Consent = "granted" | "denied";

const googleTagBootstrap = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`;

function readConsent(): Consent | null {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    return stored === "granted" || stored === "denied" ? stored : null;
  } catch {
    return null;
  }
}

export function Analytics({ nonce }: { nonce?: string }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent | null>(null);
  const [promptVisible, setPromptVisible] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = readConsent();
      setConsent(stored);
      setPromptVisible(stored === null);
    });
  }, []);

  const decide = (next: Consent) => {
    try {
      localStorage.setItem(CONSENT_KEY, next);
    } catch {
      // Consent still applies for this session even if it can't persist.
    }
    setConsent(next);
    setPromptVisible(false);
  };

  // The privacy policy promises analytics never runs on the unlocked vault
  // itself, so this stays out of that route entirely — not just unprompted.
  if (pathname?.startsWith("/vault")) return null;

  return (
    <>
      {consent === "granted" && (
        <>
          <Script
            id="velora-google-tag"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
            nonce={nonce}
          />
          <Script
            id="velora-google-tag-bootstrap"
            strategy="afterInteractive"
            nonce={nonce}
            dangerouslySetInnerHTML={{ __html: googleTagBootstrap }}
          />
        </>
      )}
      {promptVisible && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          aria-describedby="velora-consent-copy"
          className="fixed z-[9998] bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm p-4 rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-[0_20px_50px_rgb(0,0,0,0.18)]"
        >
          <p id="velora-consent-copy" className="text-[13px] leading-relaxed text-foreground">
            We&rsquo;d like to use Google Analytics to understand site usage.
            This never includes your vault contents.{" "}
            <a href="/privacy" className="underline underline-offset-2">Privacy policy</a>
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => decide("denied")}
              className="text-[13px] font-semibold px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => decide("granted")}
              className="text-[13px] font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Accept
            </button>
          </div>
        </div>
      )}
    </>
  );
}
