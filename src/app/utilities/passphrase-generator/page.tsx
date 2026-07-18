import type { Metadata } from "next";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { PassphraseGeneratorClient } from "./PassphraseGeneratorClient";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Passphrase Generator — Velora Vault",
  description: "Generate highly secure, memorable passphrases with custom dictionaries.",
  path: "/utilities/passphrase-generator",
});

export default function PassphraseGeneratorPage() {
  return (
    <PublicPageShell>
      <PassphraseGeneratorClient />
    </PublicPageShell>
  );
}
