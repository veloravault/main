import { ResetPasswordClient } from "@/components/auth/ResetPasswordClient";
import { PublicPageShell } from "@/components/velora/PublicPageShell";

export default function ResetPasswordPage() {
  return (
    <PublicPageShell>
      <ResetPasswordClient />
    </PublicPageShell>
  );
}
