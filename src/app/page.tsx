import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import styles from "./dreelio/dreelio.module.css";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { Hero } from "@/components/dreelio/Hero";
import { Devices } from "@/components/dreelio/Devices";
import { FeatureSplit } from "@/components/dreelio/FeatureSplit";
import { Features } from "@/components/dreelio/Features";
import { Highlights } from "@/components/dreelio/Highlights";
import { SecurityArchitecture } from "@/components/dreelio/SecurityArchitecture";
import { Pricing } from "@/components/dreelio/Pricing";
import { FinalCTA } from "@/components/dreelio/FinalCTA";
import { PROJECT_PILLS, FINANCE_PILLS } from "@/components/dreelio/data";

const TITLE = "Velora Vault — One private vault for everything that matters";
const DESCRIPTION =
  "A private, encrypted home for passwords, documents, notes and financial essentials. Your master key never leaves your device.";

export const metadata: Metadata = {
  ...pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/" }),
  // Bypass the root layout's title template: the homepage deliberately leads
  // with the brand name itself, so appending "— Velora Vault" again would
  // duplicate it.
  title: { absolute: TITLE },
};

export default function HomePage() {
  return (
    <PublicPageShell>
      <main className={styles.page}>
        <Hero />

        <Devices />

        <FeatureSplit
          eyebrow="Password vault"
          title={<>Never reuse a weak password again</>}
          body={
            <>
              <strong>Save every login once</strong>, and Velora Vault flags
              weak, reused, or aging passwords automatically. Strength scoring
              and duplicate detection keep you a step ahead.
            </>
          }
          pills={PROJECT_PILLS}
          preview="passwords"
        />

        <FeatureSplit
          reverse
          eyebrow="Wallet & bank vault"
          title={<>Your cards and accounts, one tap away</>}
          body={
            <>
              <strong>Scan a card with your camera</strong>, or type it in
              once. Velora Vault keeps card numbers, PINs, and bank details
              encrypted and ready whenever you need them.
            </>
          }
          pills={FINANCE_PILLS}
          preview="wallet"
        />

        <Features />
        <Highlights />
        <SecurityArchitecture />
        <Pricing />
        <FinalCTA />
      </main>
    </PublicPageShell>
  );
}
