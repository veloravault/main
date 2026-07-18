import type { Metadata } from "next";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { UsernameGeneratorClient } from "./UsernameGeneratorClient";

export const metadata: Metadata = {
  title: "Username Generator — Velora Vault",
  description: "Generate secure, anonymous usernames to protect your privacy.",
};

export default function UsernameGeneratorPage() {
  return (
    <PublicPageShell>
      <main className="max-w-3xl mx-auto px-6 py-24 min-h-[80vh]">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">Username Generator</h1>
            <p className="text-lg text-muted-foreground">Create anonymous usernames to protect your identity.</p>
          </div>
          
          <UsernameGeneratorClient />
        </div>
      </main>
    </PublicPageShell>
  );
}
