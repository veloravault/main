import type { Metadata } from "next";
import { ProductPageContent } from "@/components/velora/product-pages/ProductPageContent";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Credential vault",
  description: "Store SSH keys, crypto passphrases, API credentials, WiFi passwords, and 2FA backup codes in purpose-built encrypted records.",
  path: "/features/credential-vault",
});

export default function CredentialVaultPage() {
  return <PublicPageShell><ProductPageContent page="credential-vault" /></PublicPageShell>;
}
