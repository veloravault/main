import type { Metadata } from "next";
import { HelpPageContent } from "@/components/dreelio/help/HelpPageContent";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Help center",
  description: "Find guidance for account setup, unlocking, recovery, passwords, documents, wallet records, Magic Import, and billing.",
  path: "/help",
});

export default function HelpPage() {
  return <PublicPageShell><HelpPageContent /></PublicPageShell>;
}

