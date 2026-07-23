import type { Metadata } from "next";
import { ProductPageContent } from "@/components/velora/product-pages/ProductPageContent";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "WiFi passwords",
  description: "Store a network name and password together in one encrypted, purpose-built vault record.",
  path: "/features/wifi-passwords",
});

export default function WifiPasswordsPage() {
  return <PublicPageShell><ProductPageContent page="wifi-passwords" /></PublicPageShell>;
}
