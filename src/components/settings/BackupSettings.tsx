"use client";

import { useRef, useState } from "react";
import { AlertTriangleIcon, ArchiveIcon, CheckCircleIcon, DownloadIcon, Loader2Icon, ShieldCheckIcon, UploadIcon } from "lucide-react";
import { AdaptiveSheet, AdaptiveSheetBody, AdaptiveSheetFooter } from "@/components/ui/adaptive-sheet";
import { Button } from "@/components/ui/button";
import { BackupExportError, downloadEncryptedVaultBackup, exportEncryptedVaultBackup } from "@/lib/vaultBackup";
import {
  BackupRestoreError,
  backupMatchesMasterKey,
  parseVaultBackupFile,
  restoreVaultBackup,
  type ParsedBackup,
  type RestoreProgress,
  type RestoreResult,
} from "@/lib/vaultRestore";
import { invalidateCache } from "@/lib/vaultCache";
import { useToast } from "@/components/Toast";

const RECORD_LABELS: Record<"passwords" | "documents" | "notes" | "wallet" | "credentials", string> = {
  passwords: "Passwords",
  documents: "Documents",
  notes: "Notes",
  wallet: "Wallet & bank records",
  credentials: "Credentials",
};

export function BackupSettings({ masterPassword }: { masterPassword: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const toast = useToast();

  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [parsedBackup, setParsedBackup] = useState<ParsedBackup | null>(null);
  const [keyMismatchWarning, setKeyMismatchWarning] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<RestoreProgress | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);

  const exportBackup = async () => {
    setExporting(true);
    setError(null);
    try {
      const result = await exportEncryptedVaultBackup((completed, total) => setProgress({ completed, total }));
      downloadEncryptedVaultBackup(result.backup, result.filename);
      setLastExport(new Date().toLocaleString());
      setConfirmOpen(false);
      toast("Encrypted backup exported", "success");
    } catch (reason) {
      const message = reason instanceof BackupExportError && reason.documentTitle
        ? `${reason.message} Document: ${reason.documentTitle}`
        : reason instanceof Error ? reason.message : "The encrypted backup could not be created.";
      setError(message);
    } finally {
      setExporting(false);
    }
  };

  const pickRestoreFile = () => restoreInputRef.current?.click();

  const onRestoreFileSelected = async (file: File | undefined) => {
    if (restoreInputRef.current) restoreInputRef.current.value = "";
    if (!file) return;
    setRestoreResult(null);
    setRestoreError(null);
    try {
      const parsed = await parseVaultBackupFile(file);
      setParsedBackup(parsed);
      setKeyMismatchWarning(!(await backupMatchesMasterKey(parsed.backup, masterPassword)));
      setRestoreOpen(true);
    } catch (reason) {
      toast(reason instanceof BackupRestoreError || reason instanceof Error ? reason.message : "This backup file could not be read.", "error");
    }
  };

  const runRestore = async () => {
    if (!parsedBackup) return;
    setRestoring(true);
    setRestoreError(null);
    setRestoreProgress(null);
    try {
      const result = await restoreVaultBackup(parsedBackup.backup, setRestoreProgress);
      const credentialCacheKeys = ["secure_credentials:ssh_key", "secure_credentials:crypto_wallet", "secure_credentials:api_credential", "secure_credentials:wifi_credential", "secure_credentials:two_factor_backup"];
      for (const key of ["vault_items", "vault_documents", "secure_notes", "secure_wallet_cards", "secure_wallet_banks", ...credentialCacheKeys]) {
        invalidateCache(key);
      }
      setRestoreResult(result);
      if (result.errors.length === 0) {
        toast("Backup restored", "success");
        setRestoreOpen(false);
        setParsedBackup(null);
      }
    } catch (reason) {
      setRestoreError(reason instanceof BackupRestoreError || reason instanceof Error ? reason.message : "The backup could not be restored.");
    } finally {
      setRestoring(false);
    }
  };

  const closeRestoreSheet = () => {
    if (restoring) return;
    setRestoreOpen(false);
    setParsedBackup(null);
    setRestoreError(null);
    setRestoreResult(null);
    setRestoreProgress(null);
  };

  return (
    <section className="settings-detail-section" aria-labelledby="settings-backup-title">
      <header><p className="type-group-label">Data & Backup</p><h2 id="settings-backup-title">Encrypted export</h2><p>Download the encrypted records already stored in your vault.</p></header>
      <div className="apple-grouped-list">
        <div className="settings-backup-hero">
          <span><ArchiveIcon aria-hidden="true" /></span>
          <div><h3>Velora Vault backup</h3><p>The export contains ciphertext, encryption metadata and encrypted document blobs. Your existing master key is required to read restored data.</p></div>
          <Button onClick={() => setConfirmOpen(true)} className="settings-primary-button"><DownloadIcon />Export backup</Button>
        </div>
        <div className="settings-backup-facts" style={{ margin: 0 }}>
          <div><ShieldCheckIcon aria-hidden="true" /><span><strong>Encrypted only</strong><small>No decrypted passwords, notes, account numbers or document contents are written to disk.</small></span></div>
          <div><CheckCircleIcon aria-hidden="true" /><span><strong>Integrity protected</strong><small>A SHA-256 digest detects a damaged or altered file before it&apos;s restored.</small></span></div>
        </div>
      </div>
      {lastExport && <p className="settings-last-export">Last exported on this device: {lastExport}</p>}

      <div className="apple-grouped-list" style={{ marginTop: 20 }}>
        <div className="settings-backup-hero">
          <span><UploadIcon aria-hidden="true" /></span>
          <div><h3>Restore from backup</h3><p>Add the items from a previously exported .veloravault file back into this vault. This adds to your vault - it doesn&apos;t replace or deduplicate existing items.</p></div>
          <Button onClick={pickRestoreFile} variant="outline" className="settings-primary-button"><UploadIcon />Choose backup file</Button>
        </div>
      </div>
      <input ref={restoreInputRef} type="file" accept=".veloravault,application/json" hidden onChange={(event) => void onRestoreFileSelected(event.target.files?.[0])} />

      <AdaptiveSheet open={confirmOpen} onOpenChange={(open) => { if (!exporting) setConfirmOpen(open); }} title="Export encrypted backup" description="The file can be large when your vault contains documents." size="sm">
        <AdaptiveSheetBody>
          <div className="settings-backup-confirm"><ShieldCheckIcon aria-hidden="true" /><p>Keep the backup private. It contains encrypted vault data and can only be interpreted with the same master key.</p></div>
          {exporting && progress.total > 0 && <div className="settings-backup-progress"><span style={{ width: `${Math.round((progress.completed / progress.total) * 100)}%` }} /><p>Collecting encrypted documents {progress.completed} of {progress.total}</p></div>}
          {error && <p className="settings-inline-error" role="alert">{error}</p>}
        </AdaptiveSheetBody>
        <AdaptiveSheetFooter><Button variant="ghost" disabled={exporting} onClick={() => setConfirmOpen(false)}>Cancel</Button><Button disabled={exporting} onClick={exportBackup} className="settings-primary-button">{exporting ? <><Loader2Icon className="animate-spin" />Creating backup</> : "Download encrypted file"}</Button></AdaptiveSheetFooter>
      </AdaptiveSheet>

      <AdaptiveSheet open={restoreOpen} onOpenChange={(open) => { if (!open) closeRestoreSheet(); }} title="Restore encrypted backup" description={parsedBackup ? `Exported ${new Date(parsedBackup.manifest.exportedAt).toLocaleString()}` : undefined} size="sm">
        <AdaptiveSheetBody>
          {parsedBackup && !restoreResult && (
            <>
              <div className="settings-backup-confirm"><ShieldCheckIcon aria-hidden="true" /><p>
                This will add {parsedBackup.manifest.counts.passwords} passwords, {parsedBackup.manifest.counts.documents} documents, {parsedBackup.manifest.counts.notes} notes, {parsedBackup.manifest.counts.wallet} wallet &amp; bank records, and {parsedBackup.manifest.counts.credentials} credentials to this vault.
              </p></div>
              {keyMismatchWarning && (
                <div className="settings-danger-warning"><AlertTriangleIcon aria-hidden="true" /><p>This backup may have been created with a different master key. Restored items could show as undecryptable until re-saved with the correct key.</p></div>
              )}
              {restoring && restoreProgress && (
                <div className="settings-backup-progress">
                  <span style={{ width: restoreProgress.total > 0 ? `${Math.round((restoreProgress.completed / restoreProgress.total) * 100)}%` : "0%" }} />
                  <p>Restoring {RECORD_LABELS[restoreProgress.stage]} - {restoreProgress.completed} of {restoreProgress.total}</p>
                </div>
              )}
              {restoreError && <p className="settings-inline-error" role="alert">{restoreError}</p>}
            </>
          )}
          {restoreResult && (
            <>
              <div className="settings-backup-confirm"><CheckCircleIcon aria-hidden="true" /><p>
                Restored {restoreResult.restored.passwords} passwords, {restoreResult.restored.documents} documents, {restoreResult.restored.notes} notes, {restoreResult.restored.wallet} wallet &amp; bank records, and {restoreResult.restored.credentials} credentials.
              </p></div>
              {restoreResult.errors.length > 0 && (
                <div className="settings-danger-warning">
                  <AlertTriangleIcon aria-hidden="true" />
                  <div>
                    <p>{restoreResult.errors.length} item{restoreResult.errors.length === 1 ? "" : "s"} could not be restored:</p>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                      {restoreResult.errors.map((message, index) => <li key={index} style={{ fontSize: 12.5 }}>{message}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </AdaptiveSheetBody>
        <AdaptiveSheetFooter>
          {restoreResult ? (
            <Button onClick={closeRestoreSheet} className="settings-primary-button">Done</Button>
          ) : (
            <>
              <Button variant="ghost" disabled={restoring} onClick={closeRestoreSheet}>Cancel</Button>
              <Button disabled={restoring} onClick={runRestore} className="settings-primary-button">{restoring ? <><Loader2Icon className="animate-spin" />Restoring…</> : "Restore backup"}</Button>
            </>
          )}
        </AdaptiveSheetFooter>
      </AdaptiveSheet>
    </section>
  );
}
