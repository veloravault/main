import type { Metadata } from "next";
import Link from "next/link";
import { AdmissionSteps } from "@/components/marketing/AdmissionSteps";
import { Highlights } from "@/components/marketing/Highlights";
import { LandingFooter } from "@/components/marketing/LandingFooter";
import { LandingHeader } from "@/components/marketing/LandingHeader";
import { ProductScenes } from "@/components/marketing/ProductScenes";
import { SecurityStory } from "@/components/marketing/SecurityStory";
import { TechFoundation } from "@/components/marketing/TechFoundation";
import { VaultAperture } from "@/components/marketing/VaultAperture";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Velora Vault — Private by invitation",
  description:
    "A private, encrypted home for passwords, documents, notes and financial essentials.",
};

export default function HomePage() {
  return (
    <div className={styles.page}>
      <LandingHeader />
      <main>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>Private by invitation.</p>
            <h1 id="hero-title">
              <span>Everything important.</span>
              <span>Only yours.</span>
            </h1>
            <p className={styles.heroDescription}>
              A calm, encrypted home for passwords, documents, notes and
              financial essentials.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryCta} href="/request-access">
                Request access <span aria-hidden="true">→</span>
              </Link>
              <Link className={styles.secondaryCta} href="/login">
                Already invited? Sign in
              </Link>
            </div>
          </div>
          <p className={styles.heroAside} aria-hidden="true">
            <span>Passwords</span><span>Documents</span><span>Notes</span><span>Financial essentials</span>
          </p>
        </section>

        <Highlights />
        <VaultAperture />
        <ProductScenes />
        <SecurityStory />
        <TechFoundation />
        <AdmissionSteps />

        <section className={styles.finalCta} aria-labelledby="final-cta-title">
          <p className={styles.sectionEyebrow}>Admission is considered, not automatic</p>
          <h2 id="final-cta-title">A quieter place for your digital life.</h2>
          <p>Tell us your name and email. If an invitation becomes available, we’ll be in touch.</p>
          <Link className={styles.primaryCta} href="/request-access">
            Request access <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
