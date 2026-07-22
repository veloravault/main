import type { Metadata } from "next";
import { ProductPageContent } from "@/components/dreelio/product-pages/ProductPageContent";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Personal password manager",
  description: "Create strong credentials and keep passwords, notes, documents, cards, and bank records in one private encrypted vault.",
  path: "/password-manager",
});

export default function PasswordManagerPage() {
  return <PublicPageShell><ProductPageContent page="password-manager" /></PublicPageShell>;
}

