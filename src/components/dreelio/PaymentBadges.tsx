// Accepted-payment-method trust badges for the footer. Kept as simple,
// informational marks (not full trademarked logo reproductions) — the
// standard, low-risk way sites indicate "we accept this" without claiming
// official brand assets.

import styles from "./PaymentBadges.module.css";

function MastercardBadge() {
  return (
    <svg width="26" height="16" viewBox="0 0 26 16" aria-label="Mastercard" role="img">
      <circle cx="10" cy="8" r="7.5" fill="#EB001B" />
      <circle cx="16" cy="8" r="7.5" fill="#F79E1B" fillOpacity="0.85" />
    </svg>
  );
}

export function PaymentBadges({ className }: { className?: string }) {
  return (
    <div className={`${styles.row} ${className ?? ""}`} role="group" aria-label="Accepted payment methods">
      <span className={styles.visa}>VISA</span>
      <MastercardBadge />
      <span className={styles.text}>RuPay</span>
      <span className={styles.text}>UPI</span>
      <span className={styles.text}>Net Banking</span>
    </div>
  );
}
