import type { Metadata } from "next";
import { AuthGateway } from "@/components/auth/AuthGateway";

export const metadata: Metadata = {
  title: "Request access — Velora Vault",
  description: "Request an invitation to Velora Vault.",
};

export default function RequestAccessPage() {
  return <AuthGateway initialMode="request-access" />;
}
