import Image from "next/image";
import styles from "./PaymentBadges.module.css";

const PAYMENT_MARKS = [
  { name: "Visa", src: "/payment-logos/visa.svg", width: 56, height: 18 },
  { name: "Mastercard", src: "/payment-logos/mastercard.svg", width: 34, height: 21 },
  { name: "RuPay", src: "/payment-logos/rupay.svg", width: 58, height: 20 },
  { name: "UPI", src: "/payment-logos/upi.svg", width: 52, height: 20 },
] as const;

export function PaymentBadges({ className }: { className?: string }) {
  return (
    <div className={`${styles.row} ${className ?? ""}`} role="group" aria-label="Accepted payment methods">
      <span className={styles.marks}>
        {PAYMENT_MARKS.map((mark) => (
          <span className={styles.mark} key={mark.name}>
            <Image src={mark.src} alt={mark.name} width={mark.width} height={mark.height} />
          </span>
        ))}
      </span>
      <span className={styles.text}>Net banking via Razorpay</span>
    </div>
  );
}
