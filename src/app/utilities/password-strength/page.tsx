import type { Metadata } from "next";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { PasswordStrengthClient } from "./PasswordStrengthClient";

export const metadata: Metadata = {
  title: "Password Strength Tester — Velora Vault",
  description: "Test your password strength and see how long it would take to crack.",
};

export default function PasswordStrengthPage() {
  return (
    <PublicPageShell>
      <main className="max-w-3xl mx-auto px-6 py-24 min-h-[80vh]">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">Password Strength</h1>
            <p className="text-lg text-muted-foreground">Test the strength of your passwords.</p>
          </div>
          
          <PasswordStrengthClient />
        </div>
      </main>
    </PublicPageShell>
  );
}
