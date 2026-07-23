import type { Metadata } from "next";
import { ProductPageContent } from "@/components/velora/product-pages/ProductPageContent";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "API credentials",
  description: "Store a service name, key, and secret together in one encrypted, purpose-built vault record.",
  path: "/features/api-credentials",
});

export default function ApiCredentialsPage() {
  return <PublicPageShell><ProductPageContent page="api-credentials" /></PublicPageShell>;
}
