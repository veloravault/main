import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlertIcon } from "lucide-react";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { AuthorizationError, requireAdmin } from "@/lib/server/access";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: "Access Console - Velora Vault",
  description: "Owner access review for Velora Vault.",
  // Defense-in-depth: this page can render real content (a 200 "Unauthorized"
  // panel, or the console itself) for authenticated requests, so it must
  // never be indexed even if the redirect-on-unauthenticated path is missed.
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  let adminEmail: string | null = null;
  let unauthenticated = false;
  let unauthorized = false;

  try {
    const admin = await requireAdmin();
    adminEmail = admin.email ?? "Verified owner";
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error;
    unauthenticated = error.status === 401;
    unauthorized = error.status === 403;
  }

  if (unauthenticated) redirect("/login?next=/admin");

  if (unauthorized || !adminEmail) {
    return (
      <main className={styles.deniedPage}>
        <section className={styles.deniedPanel} aria-labelledby="unauthorized-title">
          <span className={styles.deniedIcon}><ShieldAlertIcon aria-hidden="true" /></span>
          <p className={styles.eyebrow}>Private owner console</p>
          <h1 id="unauthorized-title">Unauthorized</h1>
          <p>This area is available only to the configured vault owner.</p>
        </section>
      </main>
    );
  }

  return <AdminConsole adminEmail={adminEmail} />;
}
