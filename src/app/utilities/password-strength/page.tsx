import type { Metadata } from "next";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { PasswordStrengthClient } from "./PasswordStrengthClient";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Password Strength Tester",
  description: "Test the strength of your passwords locally to ensure they are secure.",
  path: "/utilities/password-strength",
});

export default function PasswordStrengthPage() {
  return (
    <PublicPageShell>
      <PasswordStrengthClient />
    </PublicPageShell>
  );
}
