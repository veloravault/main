import type { Metadata } from "next";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { PricingPageContent } from "@/components/dreelio/PricingPageContent";

export const metadata: Metadata = {
  title: "Pricing — Velora Vault",
  description:
    "Free, Plus, and Family tiers for Velora Vault. Start free, no credit card required.",
};

export default function PricingPage() {
  return (
    <PublicPageShell>
      <PricingPageContent />
    </PublicPageShell>
  );
}
