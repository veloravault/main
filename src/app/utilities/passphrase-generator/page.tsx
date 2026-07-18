import type { Metadata } from "next";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { PassphraseGeneratorClient } from "./PassphraseGeneratorClient";

export const metadata: Metadata = {
  title: "Passphrase Generator — Velora Vault",
  description: "Generate memorable and highly secure passphrases.",
};

export default function PassphraseGeneratorPage() {
  return (
    <PublicPageShell>
      <main className="max-w-3xl mx-auto px-6 py-24 min-h-[80vh]">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">Passphrase Generator</h1>
            <p className="text-lg text-muted-foreground">Create secure, easy-to-remember passphrases.</p>
          </div>
          
          <PassphraseGeneratorClient />
        </div>
      </main>
    </PublicPageShell>
  );
}
