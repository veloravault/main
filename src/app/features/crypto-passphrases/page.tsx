import type { Metadata } from "next";
import { ProductPageContent } from "@/components/velora/product-pages/ProductPageContent";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Crypto passphrases",
  description: "Store a wallet's seed phrase and address in one encrypted, purpose-built vault record - never a screenshot or a paper backup.",
  path: "/features/crypto-passphrases",
});

export default function CryptoPassphrasesPage() {
  return <PublicPageShell><ProductPageContent page="crypto-passphrases" /></PublicPageShell>;
}
