import type { Metadata } from "next";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { SecurityPageContent } from "@/components/dreelio/SecurityPageContent";

export const metadata: Metadata = {
  title: "How security works — Velora Vault",
  description:
    "The encryption model, access controls, recovery limits, and threat boundaries behind Velora Vault.",
};

export default function SecurityPage() {
  return (
    <PublicPageShell>
      <SecurityPageContent />
    </PublicPageShell>
  );
}
