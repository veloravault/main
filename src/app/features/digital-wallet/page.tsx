import type { Metadata } from "next";
import { ProductPageContent } from "@/components/dreelio/product-pages/ProductPageContent";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Private digital wallet",
  description: "Organize payment cards and bank account records in dedicated encrypted views with sensitive values masked by default.",
  path: "/features/digital-wallet",
});

export default function DigitalWalletPage() {
  return <PublicPageShell><ProductPageContent page="digital-wallet" /></PublicPageShell>;
}

