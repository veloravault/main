import type { Metadata } from "next";
import { AuthGateway } from "@/components/auth/AuthGateway";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";

export const metadata: Metadata = {
  title: "Request access — Velora Vault",
  description: "Request an invitation to Velora Vault.",
};

export default function RequestAccessPage() {
  return (
    <PublicPageShell>
      <AuthGateway initialMode="request-access" />
    </PublicPageShell>
  );
}
