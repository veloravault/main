import type { Metadata } from "next";
import { ProductPageContent } from "@/components/velora/product-pages/ProductPageContent";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Personal password manager",
  description: "Create strong credentials and keep passwords, notes, documents, cards, bank records, and technical credentials in one private encrypted vault.",
  path: "/password-manager",
});

export default function PasswordManagerPage() {
  return <PublicPageShell><ProductPageContent page="password-manager" /></PublicPageShell>;
}

