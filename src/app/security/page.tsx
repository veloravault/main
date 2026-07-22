import type { Metadata } from "next";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { SecurityPageContent } from "@/components/velora/SecurityPageContent";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "How security works",
  description:
    "The encryption model, access controls, recovery limits, and threat boundaries behind Velora Vault.",
  path: "/security",
});

export default function SecurityPage() {
  return (
    <PublicPageShell>
      <SecurityPageContent />
    </PublicPageShell>
  );
}
