import type { Metadata } from "next";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { PasswordGeneratorClient } from "./PasswordGeneratorClient";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Password Generator",
  description: "Generate highly secure, unpredictable passwords to keep your data safe.",
  path: "/utilities/password-generator",
});

export default function PasswordGeneratorPage() {
  return (
    <PublicPageShell>
      <PasswordGeneratorClient />
    </PublicPageShell>
  );
}
