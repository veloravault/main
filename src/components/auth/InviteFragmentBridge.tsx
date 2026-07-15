"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./auth-shell.module.css";

const SAFE_DESTINATIONS = new Set(["/onboarding", "/vault"]);

export function InviteFragmentBridge() {
  const router = useRouter();
  const mounted = useRef(false);
  const invitationTask = useRef<Promise<void> | null>(null);

  useEffect(() => {
    mounted.current = true;

    async function completeInvitation() {
      const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");
      const type = fragment.get("type");

      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);

      if (type !== "invite" || !accessToken || !refreshToken) {
        router.replace("/accept-invite?state=invalid");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error || !mounted.current) {
        if (mounted.current) router.replace("/accept-invite?state=expired");
        return;
      }

      const response = await fetch("/auth/invite-session", {
        method: "POST",
        credentials: "same-origin",
      });
      const result: unknown = await response.json().catch(() => null);
      const next = result && typeof result === "object" && "next" in result
        ? (result as { next?: unknown }).next
        : null;

      if (mounted.current && response.ok && typeof next === "string" && SAFE_DESTINATIONS.has(next)) {
        router.replace(next);
        router.refresh();
        return;
      }

      await supabase.auth.signOut();
      if (mounted.current) router.replace("/accept-invite?state=invalid");
    }

    invitationTask.current ??= completeInvitation();
    return () => {
      mounted.current = false;
    };
  }, [router]);

  return <p className={styles.status} role="status">Securing your invitation…</p>;
}
