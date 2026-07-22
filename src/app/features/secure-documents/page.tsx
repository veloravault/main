import type { Metadata } from "next";
import { ProductPageContent } from "@/components/dreelio/product-pages/ProductPageContent";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Secure document vault",
  description: "Encrypt sensitive files before upload and organize them with searchable labels, categories, dates, and private details.",
  path: "/features/secure-documents",
});

export default function SecureDocumentsPage() {
  return <PublicPageShell><ProductPageContent page="secure-documents" /></PublicPageShell>;
}

