import Link from "next/link";
import styles from "@/app/landing.module.css";
import { VeloraMark } from "@/components/VeloraMark";

const columns = [
  {
    heading: "Vault",
    links: [
      { href: "#security", label: "Security" },
      { href: "#privacy", label: "Privacy" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/request-access", label: "Request access" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div className={styles.footerBrand}>
          <VeloraMark className={styles.vaultMark} aria-hidden="true" />
          <span>Velora Vault</span>
          <p>A private, encrypted home for what matters.</p>
        </div>

        {columns.map((column) => (
          <nav className={styles.footerColumn} aria-label={column.heading} key={column.heading}>
            <span>{column.heading}</span>
            {column.links.map((link) => (
              <Link href={link.href} key={link.label}>
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>

      <div className={styles.footerBase}>
        <span>© {new Date().getFullYear()} Velora Vault</span>
      </div>
    </footer>
  );
}
