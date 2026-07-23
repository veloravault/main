import type { Metadata } from "next";
import { ProductPageContent } from "@/components/velora/product-pages/ProductPageContent";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "2FA backup codes",
  description: "Store one-time two-factor recovery codes in one encrypted, purpose-built vault record.",
  path: "/features/2fa-backup-codes",
});

export default function TwoFactorBackupCodesPage() {
  return <PublicPageShell><ProductPageContent page="2fa-backup-codes" /></PublicPageShell>;
}
