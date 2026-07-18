import type { Metadata } from "next";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { PasswordGeneratorClient } from "./PasswordGeneratorClient";

export const metadata: Metadata = {
  title: "Password Generator — Velora Vault",
  description: "Generate secure, random passwords instantly to keep your accounts safe.",
};

export default function PasswordGeneratorPage() {
  return (
    <PublicPageShell>
      <main className="max-w-3xl mx-auto px-6 py-24 min-h-[80vh]">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">Password Generator</h1>
            <p className="text-lg text-muted-foreground">Create strong, secure passwords instantly.</p>
          </div>
          
          <PasswordGeneratorClient />
        </div>
      </main>
    </PublicPageShell>
  );
}
