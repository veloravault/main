"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import styles from "./Analytics.module.css";

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
  const [customizing, setCustomizing] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

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
    setCustomizing(false);
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
        <>
          {customizing && (
            <div className={styles.preferences} role="dialog" aria-modal="true" aria-label="Cookie preferences">
              <div className={styles.preferencesHead}>
                <div>
                  <p>Privacy controls</p>
                  <h2>Customize cookie settings</h2>
                </div>
                <button type="button" onClick={() => setCustomizing(false)} aria-label="Close cookie settings">×</button>
              </div>
              <div className={styles.preferenceRow}>
                <div><strong>Essential storage</strong><span>Required for theme and security preferences.</span></div>
                <span className={styles.alwaysOn}>Always on</span>
              </div>
              <label className={styles.preferenceRow}>
                <div><strong>Analytics</strong><span>Helps us understand public-site usage. Vault contents are never included.</span></div>
                <input
                  type="checkbox"
                  checked={analyticsEnabled}
                  onChange={(event) => setAnalyticsEnabled(event.target.checked)}
                />
              </label>
              <div className={styles.preferenceActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setCustomizing(false)}>Cancel</button>
                <button type="button" className={styles.primaryButton} onClick={() => decide(analyticsEnabled ? "granted" : "denied")}>Save choices</button>
              </div>
            </div>
          )}

          <div
            role="dialog"
            aria-label="Cookie consent"
            aria-describedby="velora-consent-copy"
            className={styles.consentBar}
          >
            <p id="velora-consent-copy">
              We use essential storage for site functionality and optional analytics to understand public-site usage. Analytics never includes vault contents.{" "}
              <a href="/privacy">Privacy policy</a>
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => decide("denied")}
                className={styles.secondaryButton}
              >Reject all</button>
              <button
                type="button"
                onClick={() => {
                  setAnalyticsEnabled(consent === "granted");
                  setCustomizing(true);
                }}
                className={styles.secondaryButton}
              >Customize settings</button>
              <button
                type="button"
                onClick={() => decide("granted")}
                className={styles.primaryButton}
              >Accept all</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
