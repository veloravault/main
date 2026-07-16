import type { Metadata } from "next";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { PricingPageContent } from "@/components/dreelio/PricingPageContent";

export const metadata: Metadata = {
  title: "Pricing — Velora Vault",
  description:
    "Free, Plus, and Family tiers for Velora Vault. Free during private beta — see what pricing looks like after.",
};

export default function PricingPage() {
  return (
    <PublicPageShell>
      <PricingPageContent />
    </PublicPageShell>
  );
}
