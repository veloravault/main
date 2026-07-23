import type { Metadata } from "next";
import { ProductPageContent } from "@/components/velora/product-pages/ProductPageContent";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Magic Import",
  description: "Extract editable candidates for passwords, notes, cards, banks, SSH keys, crypto wallets, API keys, WiFi, and 2FA codes from source text, then review before saving.",
  path: "/features/magic-import",
});

export default function MagicImportPage() {
  return <PublicPageShell><ProductPageContent page="magic-import" /></PublicPageShell>;
}

