import type { Metadata } from "next";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { UsernameGeneratorClient } from "./UsernameGeneratorClient";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Username Generator",
  description: "Generate secure, anonymous usernames to protect your privacy.",
  path: "/utilities/username-generator",
});

export default function UsernameGeneratorPage() {
  return (
    <PublicPageShell>
      <UsernameGeneratorClient />
    </PublicPageShell>
  );
}
