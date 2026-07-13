"use client";

import { useState } from "react";
import { AlertTriangleIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { AdaptiveSheet, AdaptiveSheetBody, AdaptiveSheetFooter } from "@/components/ui/adaptive-sheet";
import { Button } from "@/components/ui/button";
import { LocalVerificationSheet } from "@/components/settings/LocalVerificationSheet";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

type DangerAction = "clear" | "account";

export function DangerSettings({ masterPassword }: { masterPassword: string }) {
  const [action, setAction] = useState<DangerAction | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const runAction = async () => {
    if (!action) return;
    setWorking(true);
    setError(null);
    try {
      if (action === "account") {
        const response = await fetch("/api/delete-account", { method: "POST" });
        const payload = await response.json() as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Account deletion failed.");
        await supabase.auth.signOut({ scope: "global" });
        window.location.assign("/");
        return;
      }

      const { data: documents, error: documentError } = await supabase.from("vault_documents").select("storage_path");
      if (documentError) throw documentError;
      const paths = (documents ?? []).map((document) => document.storage_path).filter(Boolean);
      if (paths.length) {
        const { error: storageError } = await supabase.storage.from("vault_documents").remove(paths);
        if (storageError) throw storageError;
      }
      const deletions = await Promise.all([
        supabase.from("vault_documents").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("vault_items").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("secure_notes").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("secure_wallet").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      ]);
      const deletionError = deletions.find((result) => result.error)?.error;
      if (deletionError) throw deletionError;
      setAction(null);
      setConfirmation("");
      toast("Vault data cleared", "success");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The destructive action could not be completed.");
    } finally {
      setWorking(false);
    }
  };

  const open = (nextAction: DangerAction) => { setAction(nextAction); setConfirmation(""); setError(null); };
  const actionLabel = action === "account" ? "Delete account" : "Clear vault data";

  return (
    <section className="settings-detail-section" aria-labelledby="settings-danger-title">
      <header><p className="type-group-label settings-danger-label">Danger Zone</p><h2 id="settings-danger-title">Destructive actions</h2><p>These actions cannot be undone after local verification.</p></header>
      <div className="settings-group settings-danger-group">
        <DangerRow title="Clear vault data" description="Permanently erase passwords, notes, documents, cards and bank accounts." label="Clear data" onClick={() => open("clear")} />
        <DangerRow title="Delete account" description="Permanently remove your account and all associated vault data." label="Delete account" onClick={() => open("account")} />
      </div>
      <AdaptiveSheet open={Boolean(action)} onOpenChange={(openState) => { if (!working && !openState) setAction(null); }} title={actionLabel} description="This action requires typed confirmation and fresh local verification." size="sm">
        <AdaptiveSheetBody>
          <div className="settings-danger-warning"><AlertTriangleIcon aria-hidden="true" /><p>{action === "account" ? "Your account and all vault data will be permanently removed." : "Every item and encrypted document in this vault will be permanently removed."}</p></div>
          <label className="settings-danger-confirm"><span>Type <strong>DELETE</strong> to continue</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="DELETE" autoComplete="off" /></label>
          {error && <p className="settings-inline-error" role="alert">{error}</p>}
        </AdaptiveSheetBody>
        <AdaptiveSheetFooter><Button variant="ghost" disabled={working} onClick={() => setAction(null)}>Cancel</Button><Button variant="destructive" disabled={confirmation !== "DELETE" || working} onClick={() => setVerifyOpen(true)}>{working ? <Loader2Icon className="animate-spin" /> : actionLabel}</Button></AdaptiveSheetFooter>
      </AdaptiveSheet>
      <LocalVerificationSheet open={verifyOpen} onOpenChange={setVerifyOpen} masterPassword={masterPassword} onVerified={() => { void runAction(); }} />
    </section>
  );
}

function DangerRow(props: { title: string; description: string; label: string; onClick: () => void }) {
  return <div className="settings-danger-row"><span><strong>{props.title}</strong><small>{props.description}</small></span><Button variant="destructive" onClick={props.onClick}><Trash2Icon />{props.label}</Button></div>;
}
