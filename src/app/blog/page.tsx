import type { Metadata } from "next";
import { BlogListContent } from "@/components/dreelio/BlogListContent";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";

export const metadata: Metadata = {
  title: "Blog — Velora Vault",
  description:
    "Practical guidance on passwords, encryption, and account security, plus a look at how Velora Vault is built.",
};

export default function BlogPage() {
  return (
    <PublicPageShell>
      <BlogListContent />
    </PublicPageShell>
  );
}
