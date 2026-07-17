import { redirect } from "next/navigation";
import VaultApp from "@/components/VaultApp";
import { AuthorizationError, requireActiveMember } from "@/lib/server/access";

export default async function VaultPage() {
  let redirectPath: string | null = null;

  try {
    await requireActiveMember();
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error;

    switch (error.code) {
      case "UNAUTHENTICATED":
        redirectPath = "/login?next=/vault";
        break;
      case "MEMBERSHIP_INVITED":
        redirectPath = "/onboarding";
        break;
      case "MEMBERSHIP_SUSPENDED":
        redirectPath = "/login?state=suspended";
        break;
      case "MEMBERSHIP_REVOKED":
        redirectPath = "/login?state=revoked";
        break;
      case "MEMBERSHIP_MISSING":
        redirectPath = "/signup?state=setup-incomplete";
        break;
      default:
        throw error;
    }
  }

  if (redirectPath) redirect(redirectPath);
  return <VaultApp />;
}
