import type { Metadata } from "next";
import { BlogListContent } from "@/components/dreelio/BlogListContent";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Blog",
  description:
    "Practical guidance on passwords, encryption, and account security, plus a look at how Velora Vault is built.",
  path: "/blog",
});

export default function BlogPage() {
  return (
    <PublicPageShell>
      <BlogListContent />
    </PublicPageShell>
  );
}
