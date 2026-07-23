import type { Metadata } from "next";
import { ProductPageContent } from "@/components/velora/product-pages/ProductPageContent";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "SSH keys",
  description: "Store SSH private keys, public keys, hosts, and passphrases together in one encrypted, purpose-built vault record.",
  path: "/features/ssh-keys",
});

export default function SshKeysPage() {
  return <PublicPageShell><ProductPageContent page="ssh-keys" /></PublicPageShell>;
}
