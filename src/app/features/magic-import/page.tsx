import type { Metadata } from "next";
import { ProductPageContent } from "@/components/velora/product-pages/ProductPageContent";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Magic Import",
  description: "Extract editable password, note, card, and bank record candidates from explicitly submitted source text, then review before saving.",
  path: "/features/magic-import",
});

export default function MagicImportPage() {
  return <PublicPageShell><ProductPageContent page="magic-import" /></PublicPageShell>;
}

