import type { Metadata } from "next";
import { ProductPageContent } from "@/components/dreelio/product-pages/ProductPageContent";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "How Velora Vault works",
  description: "Follow account creation, browser-side encryption, protected storage, local unlock, and master key recovery boundaries.",
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  return <PublicPageShell><ProductPageContent page="how-it-works" /></PublicPageShell>;
}

