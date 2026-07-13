"use client";

import { useState } from "react";
import { ArchiveIcon, CheckCircleIcon, DownloadIcon, Loader2Icon, ShieldCheckIcon } from "lucide-react";
import { AdaptiveSheet, AdaptiveSheetBody, AdaptiveSheetFooter } from "@/components/ui/adaptive-sheet";
import { Button } from "@/components/ui/button";
import { BackupExportError, downloadEncryptedVaultBackup, exportEncryptedVaultBackup } from "@/lib/vaultBackup";
import { useToast } from "@/components/Toast";

export function BackupSettings() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const toast = useToast();

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

  return (
    <section className="settings-detail-section" aria-labelledby="settings-backup-title">
      <header><p className="type-group-label">Data & Backup</p><h2 id="settings-backup-title">Encrypted export</h2><p>Download the encrypted records already stored in your vault.</p></header>
      <div className="settings-backup-hero settings-group">
        <span><ArchiveIcon aria-hidden="true" /></span>
        <div><h3>Telkar Vault backup</h3><p>The export contains ciphertext, encryption metadata and encrypted document blobs. Your existing master key is required to read restored data.</p></div>
        <Button onClick={() => setConfirmOpen(true)} className="settings-primary-button"><DownloadIcon />Export backup</Button>
      </div>
      <div className="settings-backup-facts settings-group">
        <div><ShieldCheckIcon aria-hidden="true" /><span><strong>Encrypted only</strong><small>No decrypted passwords, notes, account numbers or document contents are written to disk.</small></span></div>
        <div><CheckCircleIcon aria-hidden="true" /><span><strong>Integrity protected</strong><small>A SHA-256 digest is included so a future restore flow can detect a damaged file.</small></span></div>
      </div>
      {lastExport && <p className="settings-last-export">Last exported on this device: {lastExport}</p>}
      <AdaptiveSheet open={confirmOpen} onOpenChange={(open) => { if (!exporting) setConfirmOpen(open); }} title="Export encrypted backup" description="The file can be large when your vault contains documents." size="sm">
        <AdaptiveSheetBody>
          <div className="settings-backup-confirm"><ShieldCheckIcon aria-hidden="true" /><p>Keep the backup private. It contains encrypted vault data and can only be interpreted with the same master key.</p></div>
          {exporting && progress.total > 0 && <div className="settings-backup-progress"><span style={{ width: `${Math.round((progress.completed / progress.total) * 100)}%` }} /><p>Collecting encrypted documents {progress.completed} of {progress.total}</p></div>}
          {error && <p className="settings-inline-error" role="alert">{error}</p>}
        </AdaptiveSheetBody>
        <AdaptiveSheetFooter><Button variant="ghost" disabled={exporting} onClick={() => setConfirmOpen(false)}>Cancel</Button><Button disabled={exporting} onClick={exportBackup} className="settings-primary-button">{exporting ? <><Loader2Icon className="animate-spin" />Creating backup</> : "Download encrypted file"}</Button></AdaptiveSheetFooter>
      </AdaptiveSheet>
    </section>
  );
}
