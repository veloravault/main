/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { encryptFile, decryptFile } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { analyzeImageName, categorizeDocument } from "@/app/actions";
import { setCache, invalidateCache } from "@/lib/vaultCache";
import { CardListSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdaptiveSheet, AdaptiveSheetBody, AdaptiveSheetFooter } from "@/components/ui/adaptive-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon, ChevronRightIcon, FileIcon, DownloadIcon, XIcon, SparklesIcon, MoreHorizontalIcon, CheckSquareIcon, SquareIcon, TrashIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useOptimisticDelete } from "@/hooks/useOptimisticDelete";
import { ContextActions } from "@/components/ui/context-actions";
import { getVaultAccessToken } from "@/lib/authToken";
import { buildSafeDocumentFilename, getAiRenameEligibility } from "@/lib/documentFilename";
import {
  deleteObjects,
  downloadFromPresignedUrl,
  requestDownloadUrl,
  requestUploadUrl,
  uploadToPresignedUrl,
} from "@/lib/r2Client";

interface VaultDocument {
  id: string;
  title: string;
  storage_path: string;
  iv: string;
  salt: string;
  category?: string;
}

export function DocumentVault({ masterPassword, focusedItemId, refreshVersion = 0 }: { masterPassword: string, focusedItemId?: string | null, refreshVersion?: number }) {
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [useAI, setUseAI] = useState(true);
  const [renameFeedback, setRenameFeedback] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, { url: string, loading: boolean }>>({});
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean, doc: VaultDocument | null, url: string, loading: boolean }>({ isOpen: false, doc: null, url: '', loading: false });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Bulk State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { scheduleDelete } = useOptimisticDelete({ items: documents, setItems: setDocuments, toastLabel: (item) => item.title || "Document", commitDelete: async (item) => {
    await deleteObjects([item.storage_path]);
    const { error } = await supabase.from("vault_documents").delete().eq("id", item.id);
    if (error) throw error;
    invalidateCache("vault_documents");
  } });

  useEffect(() => {
    if (focusedItemId) {
      queueMicrotask(() => setExpandedId(focusedItemId));
      setTimeout(() => {
        const el = document.getElementById(`item-${focusedItemId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [focusedItemId]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vault_documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching vault documents:", error.message, error.details, error.hint, JSON.stringify(error));
    } else {
      setDocuments(data || []);
      setCache("vault_documents", data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchDocuments();
    });
  }, [fetchDocuments]);

  useEffect(() => {
    if (!refreshVersion) return;
    invalidateCache("vault_documents");
    queueMicrotask(() => void fetchDocuments());
  }, [fetchDocuments, refreshVersion]);

  const getMimeType = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'application/pdf';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    return 'application/octet-stream';
  };

  const handlePreview = async (doc: VaultDocument) => {
    setPreviewModal({ isOpen: true, doc, url: '', loading: true });

    if (previews[doc.id]?.url) {
      setPreviewModal({ isOpen: true, doc, url: previews[doc.id].url, loading: false });
      return;
    }
    
    try {
      const downloadUrl = await requestDownloadUrl(doc.storage_path);
      const encryptedBuffer = await downloadFromPresignedUrl(downloadUrl);
      const decryptedBuffer = await decryptFile(encryptedBuffer, doc.salt, doc.iv, masterPassword);

      const blob = new Blob([decryptedBuffer], { type: getMimeType(doc.title) });
      const url = window.URL.createObjectURL(blob);
      setPreviews(prev => ({ ...prev, [doc.id]: { url, loading: false } }));
      setPreviewModal({ isOpen: true, doc, url, loading: false });
    } catch (err) {
      console.error("Failed to load preview:", err);
      setPreviews(prev => ({ ...prev, [doc.id]: { url: '', loading: false } }));
      setPreviewModal(prev => ({ ...prev, loading: false }));
      alert("Failed to decrypt the document. Is the vault master key correct?");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    try {
      let finalFileName = buildSafeDocumentFilename("", selectedFile.name);
      const accessToken = await getVaultAccessToken();

      if (useAI) {
        const eligibility = getAiRenameEligibility(selectedFile);
        if (!eligibility.eligible) {
          setRenameFeedback(
            eligibility.reason === "too-large"
              ? "This file is larger than 6 MB, so it will be encrypted with its original name."
              : "AI naming supports PDF, JPEG, PNG, and WebP files. The original name will be used.",
          );
        } else {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(selectedFile);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
          });
          const aiName = await analyzeImageName(accessToken, base64, selectedFile.type);
          if (aiName) {
            finalFileName = buildSafeDocumentFilename(aiName, selectedFile.name);
            setRenameFeedback(`Will save as ${finalFileName}`);
          }
        } catch (err) {
          console.error("AI rename failed:", err);
          setRenameFeedback("AI naming is temporarily unavailable. The encrypted file will keep its original name.");
        }
        }
      }

      const arrayBuffer = await selectedFile.arrayBuffer();
      const encrypted = await encryptFile(arrayBuffer, masterPassword);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Reserve an R2 key + presigned URL. The server enforces the plan gate
      // here (Free = no documents, over-quota = refused) before minting a URL.
      const { url, key: storagePath } = await requestUploadUrl(encrypted.ciphertextBuffer.byteLength);
      await uploadToPresignedUrl(url, encrypted.ciphertextBuffer);

      const category = await categorizeDocument(accessToken, finalFileName);

      const { error: dbError } = await supabase.from("vault_documents").insert({
        user_id: user.id,
        title: finalFileName,
        storage_path: storagePath,
        iv: encrypted.iv,
        salt: encrypted.salt,
        category: category,
        size_bytes: encrypted.ciphertextBuffer.byteLength,
      });

      if (dbError) {
        // The DB quota trigger is the final guard; if it rejects the row after
        // the blob landed in R2, delete the orphan so storage doesn't leak.
        await deleteObjects([storagePath]).catch(() => undefined);
        throw dbError;
      }

      setSelectedFile(null);
      setRenameFeedback(null);
      setIsAddOpen(false);
      invalidateCache("vault_documents");
      fetchDocuments();
    } catch (err: unknown) {
      console.error("Failed to upload document:", err);
      const message = err instanceof Error ? err.message : String(err);
      alert(`Upload failed: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: VaultDocument) => {
    try {
      const downloadUrl = await requestDownloadUrl(doc.storage_path);
      const encryptedBuffer = await downloadFromPresignedUrl(downloadUrl);
      const decryptedBuffer = await decryptFile(
        encryptedBuffer,
        doc.salt,
        doc.iv,
        masterPassword
      );

      const blob = new Blob([decryptedBuffer]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = doc.title;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download or decrypt:", err);
      alert("Failed to decrypt the document. Is the vault master key correct?");
    }
  };

  const handleDelete = (doc: VaultDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    if (expandedId === doc.id) setExpandedId(null);
    scheduleDelete(doc);
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const docsToDelete = documents.filter(d => selectedIds.has(d.id));
    const pathsToRemove = docsToDelete.map(d => d.storage_path);

    await deleteObjects(pathsToRemove);
    const { error } = await supabase.from("vault_documents").delete().in("id", Array.from(selectedIds));
    
    if (!error) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      invalidateCache("vault_documents");
      fetchDocuments();
    } else {
      alert("Failed to delete items");
    }
  };

  return (
    <div className="apple-surface vault-material-scope w-full">
      <div className="vault-section-toolbar">
        <div className="vault-section-heading">
          <h2 className="type-section-title">Documents</h2>
          {isSelectionMode && (
            <span className="text-[13px] font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
              {selectedIds.size} selected
            </span>
          )}
        </div>
        <div className="vault-section-actions">
          {documents.length > 0 && (
            <DropdownMenu>
            <DropdownMenuTrigger aria-label="More actions" className="vault-section-overflow rounded-full w-9 h-9 p-0 text-muted-foreground hover:bg-muted/80 flex items-center justify-center">
              <MoreHorizontalIcon className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              {documents.length > 0 && (
                <>
                  <DropdownMenuItem 
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      if (isSelectionMode) setSelectedIds(new Set());
                    }}
                    className="font-medium cursor-pointer"
                  >
                    {isSelectionMode ? "Cancel Editing" : "Select Documents"}
                  </DropdownMenuItem>
                  {isSelectionMode && (
                    <DropdownMenuItem 
                      onClick={() => {
                        if (selectedIds.size === documents.length) {
                          setSelectedIds(new Set());
                        } else {
                          setSelectedIds(new Set(documents.map(d => d.id)));
                        }
                      }}
                      className="font-medium cursor-pointer"
                    >
                      {selectedIds.size === documents.length ? "Deselect All" : "Select All"}
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          )}

          <Button type="button" variant="ghost" onClick={() => setIsAddOpen(true)} className="vault-section-primary-action rounded-full h-9 px-3 sm:px-4 text-primary hover:bg-primary/10 hover:text-primary font-medium flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              Upload
          </Button>
          <AdaptiveSheet open={isAddOpen} onOpenChange={setIsAddOpen} title="Secure File Upload" description="Encrypt a document before it is stored." size="sm" className="vault-create-sheet">
            <form onSubmit={handleUpload} className="vault-create-form">
            <AdaptiveSheetBody className="space-y-4">
              <div className="flex flex-col gap-3 p-4">
                <input
                  type="file"
                  onChange={(e) => { setSelectedFile(e.target.files?.[0] || null); setRenameFeedback(null); }}
                  required
                  className="block w-full text-[15px] text-muted-foreground
                    file:mr-4 file:py-2.5 file:px-4
                    file:rounded-full file:border-0
                    file:text-[15px] file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90 cursor-pointer"
                />
                
                <div className="flex items-center gap-2 mt-2 bg-secondary p-3 rounded-xl border border-transparent focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <input type="checkbox" id="useAI" className="w-[18px] h-[18px] rounded-sm text-primary focus:ring-primary/20 border-border" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} />
                  <label htmlFor="useAI" className="text-[14px] text-foreground font-medium flex items-center gap-1.5 cursor-pointer">
                    <SparklesIcon className="w-4 h-4 text-primary" strokeWidth={2.5} /> Auto-rename using AI Vision
                  </label>
                </div>
                <p className="px-1 text-[12px] leading-4 text-muted-foreground">
                  Files selected for AI naming are sent securely for title extraction only. The document is encrypted before storage.
                </p>
                {renameFeedback && <p role="status" className="rounded-xl bg-primary/10 px-3 py-2 text-[13px] leading-5 text-foreground">{renameFeedback}</p>}
              </div>
            </AdaptiveSheetBody>
            <AdaptiveSheetFooter><Button type="button" variant="ghost" onClick={() => { setIsAddOpen(false); setRenameFeedback(null); }}>Cancel</Button><Button type="submit" className="import-primary-action" disabled={uploading || !selectedFile}>{uploading ? "Encrypting..." : "Encrypt & Upload"}</Button></AdaptiveSheetFooter>
            </form>
          </AdaptiveSheet>
        </div>
      </div>

      <div className="w-full">
        {loading ? (
          <CardListSkeleton count={4} />
        ) : documents.length === 0 ? (
          <EmptyState type="documents" onCta={() => setIsAddOpen(true)} />
        ) : (
          <motion.div layout="position" className="flex flex-col gap-8 pb-12">
            <AnimatePresence mode="popLayout">
            {Object.entries(
              documents.reduce((acc, doc) => {
                const cat = doc.category || "Uncategorized";
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(doc);
                return acc;
              }, {} as Record<string, VaultDocument[]>)
            ).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryDocs]) => (
              <motion.div layout="position" key={category} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
                    {category}
                  </p>
                  {isSelectionMode && (
                    <button
                      onClick={() => {
                        const allInCategorySelected = categoryDocs.every(d => selectedIds.has(d.id));
                        const newSet = new Set(selectedIds);
                        if (allInCategorySelected) {
                          categoryDocs.forEach(d => newSet.delete(d.id));
                        } else {
                          categoryDocs.forEach(d => newSet.add(d.id));
                        }
                        setSelectedIds(newSet);
                      }}
                      className="text-[12px] font-semibold text-primary hover:opacity-80 transition-opacity"
                    >
                      {categoryDocs.every(d => selectedIds.has(d.id)) ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <AnimatePresence initial={false}>
                  {categoryDocs
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map((doc) => {
                  const isExpanded = expandedId === doc.id;
                  const isSelected = selectedIds.has(doc.id);

              return (
                <ContextActions key={doc.id} title={doc.title} actions={[
                  { id: "preview", label: "Preview", onSelect: () => void handlePreview(doc) },
                  { id: "download", label: "Download", onSelect: () => void handleDownload(doc) },
                  { id: "delete", label: "Delete", destructive: true, onSelect: () => { if (expandedId === doc.id) setExpandedId(null); scheduleDelete(doc); } },
                ]}>{(bindings) => <motion.div
                    {...bindings}
                    layout="position"
                    id={`item-${doc.id}`}
                    key={doc.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`relative overflow-hidden rounded-[10px] group transition-colors ${!isExpanded || expandedId !== doc.id ? 'hover:bg-black/5 dark:hover:bg-white/5' : ''} ${isSelectionMode && isSelected ? 'ring-2 ring-primary/30 bg-primary/5' : 'bg-transparent'}`}
                  >
                    {isExpanded && !isSelectionMode && (
                      <motion.div
                        key="active-bg"
                        layoutId="document-active-bg"
                        className="absolute inset-0 bg-primary/10 rounded-[10px]"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                        style={{ zIndex: 0 }}
                      />
                    )}
                    <button
                      key="trigger-btn"
                      onClick={(e) => isSelectionMode ? toggleSelection(doc.id, e) : setExpandedId(isExpanded ? null : doc.id)}
                      className="relative z-10 flex items-center justify-between p-4 sm:p-5 w-full focus:outline-none cursor-default group bg-transparent"
                    >
                    <div className="flex items-center gap-4 min-w-0">
                      {isSelectionMode && (
                        <div className="shrink-0 text-primary">
                          {isSelected
                            ? <CheckSquareIcon strokeWidth={2.5} className="w-5 h-5" />
                            : <SquareIcon strokeWidth={2} className="w-5 h-5 text-muted-foreground/50" />}
                        </div>
                      )}
                      <div className="w-10 h-10 bg-gradient-to-b from-blue-400 to-primary rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                        <FileIcon strokeWidth={2.5} className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-[18px] font-semibold truncate tracking-tight ${isExpanded ? 'text-primary' : 'text-foreground'}`}>{doc.title}</span>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-muted' : 'group-hover:bg-muted'}`}>
                      {isExpanded ? <ChevronDownIcon strokeWidth={2.5} className="w-5 h-5 text-foreground" /> : <ChevronRightIcon strokeWidth={2.5} className="w-5 h-5 text-muted-foreground" />}
                    </div>
                  </button>

                  <AnimatePresence key="animate-presence" initial={false}>
                  {isExpanded && (
                    <motion.div 
                      key="expanded-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="relative z-10 px-5 pb-5">
                        <div className="pt-4 border-t border-border">
                          
                          <div className="flex flex-row gap-3">
                            <button
                              className="flex-1 py-3 px-4 rounded-xl text-[15px] font-semibold text-foreground bg-secondary hover:bg-black/10 dark:hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                              onClick={() => handlePreview(doc)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                              View
                            </button>
                            <button
                              className="flex-1 py-3 px-4 rounded-xl text-[15px] font-semibold text-primary-foreground bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
                              onClick={() => handleDownload(doc)}
                            >
                              <DownloadIcon strokeWidth={2.5} className="w-4 h-4" />
                              Download
                            </button>
                            <button 
                              onClick={(e) => handleDelete(doc, e)}
                              className="py-3 px-6 rounded-xl text-[15px] font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 active:scale-[0.98] transition-all"
                            >
                              Delete
                            </button>
                          </div>
                          
                          <div className="mt-4 flex items-center justify-center gap-1.5 text-muted-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <span className="text-[12px] font-medium tracking-wide uppercase">End-to-End Encrypted</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </motion.div>}
                </ContextActions>
              );
            })}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <Dialog open={previewModal.isOpen} onOpenChange={(open) => {
        if (!open) {
          setPreviewModal(prev => ({ ...prev, isOpen: false }));
          setZoom(1);
          setRotation(0);
        }
      }}>
        <DialogContent showCloseButton={false} className="!max-w-[95vw] sm:!max-w-[90vw] md:!max-w-[80vw] lg:!max-w-5xl w-full h-[90vh] md:h-[85vh] flex flex-col p-0 border border-border shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] !rounded-2xl md:!rounded-[24px] overflow-hidden bg-background/95 backdrop-blur-3xl">
          <DialogHeader className="p-4 bg-transparent shrink-0 border-b border-border flex flex-row items-center justify-between">
            <DialogTitle className="font-medium text-[15px] text-foreground tracking-wide truncate pr-4">{previewModal.doc?.title}</DialogTitle>
            
            <div className="flex items-center gap-2">
              {!previewModal.loading && previewModal.url && !previewModal.doc?.title.toLowerCase().endsWith('.pdf') && (
                <div className="flex items-center gap-2 mr-2">
                  <button 
                    onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                    className="p-1.5 rounded-lg hover:bg-foreground/5 text-foreground transition-colors"
                    title="Zoom Out"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                  </button>
                  <span className="text-[13px] font-medium text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <button 
                    onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                    className="p-1.5 rounded-lg hover:bg-foreground/5 text-foreground transition-colors"
                    title="Zoom In"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                  </button>
                  <div className="w-px h-4 bg-foreground/10 mx-1" />
                  <button 
                    onClick={() => setRotation(r => r + 90)}
                    className="p-1.5 rounded-lg hover:bg-foreground/5 text-foreground transition-colors"
                    title="Rotate"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                  </button>
                </div>
              )}
              <button
                onClick={() => setPreviewModal({ isOpen: false, doc: null, url: '', loading: false })}
                className="p-1.5 rounded-full hover:bg-foreground/10 text-foreground transition-colors"
              >
                <XIcon strokeWidth={2.5} className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>
          <div className="flex-1 relative flex items-center justify-center overflow-auto bg-muted">
            {previewModal.loading ? (
               <div className="flex flex-col items-center gap-4 text-muted-foreground m-auto">
                 <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 <span className="text-[16px] font-medium tracking-wide">Decrypting securely...</span>
               </div>
            ) : previewModal.url ? (
               previewModal.doc?.title.toLowerCase().endsWith('.pdf') ? (
                 <>
                   {/* Desktop Preview */}
                   <iframe src={previewModal.url} className="hidden md:block w-full h-full border-0 bg-background" title={previewModal.doc?.title} />
                   
                   {/* Mobile Fallback */}
                   <div className="flex md:hidden flex-col items-center justify-center w-full h-full p-6 text-center space-y-4 bg-background">
                     <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                       <FileIcon className="w-8 h-8 text-primary" />
                     </div>
                     <div>
                       <h3 className="font-semibold text-lg line-clamp-2 px-4">{previewModal.doc?.title}</h3>
                       <p className="text-sm text-muted-foreground mt-2 max-w-[250px] mx-auto">PDF previews are limited on mobile devices. Open in a new tab to view or share.</p>
                     </div>
                     <a 
                       href={previewModal.url} 
                       target="_blank" 
                       rel="noreferrer" 
                       className="mt-4 px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium active:scale-95 transition-transform shadow-sm flex items-center gap-2"
                     >
                       Open PDF
                     </a>
                   </div>
                 </>
               ) : (
                 <div className="w-full h-full p-4 flex items-center justify-center min-w-full min-h-full transition-transform duration-300 ease-out" style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}>
                   <img src={previewModal.url} className="max-w-full max-h-full object-contain drop-shadow-xl rounded-lg" alt="preview" />
                 </div>
               )
            ) : (
               <div className="text-muted-foreground text-[16px] m-auto">Failed to load preview.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {isSelectionMode && (
        <><SelectionToolbar count={selectedIds.size} onCancel={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} onDelete={handleBulkDelete} /><div className="hidden md:flex fixed bottom-8 left-1/2 -translate-x-1/2 bg-popover/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl px-5 py-3.5 items-center gap-4 animate-in slide-in-from-bottom-4 duration-300 z-50">
          <button
            onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}
            className="text-[14px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-2"
          >
            Cancel
          </button>
          <div className="w-px h-5 bg-border" />
          <span className="text-[14px] font-semibold text-foreground">{selectedIds.size} selected</span>
          <div className="w-px h-5 bg-border" />
          <button
            onClick={() => setSelectedIds(new Set(documents.map(d => d.id)))}
            className="text-[14px] font-semibold text-primary hover:opacity-80 transition-opacity"
          >
            Select All
          </button>
          {selectedIds.size > 0 && (
            <>
              <div className="w-px h-5 bg-border" />
              <Button 
                variant="destructive" 
                onClick={handleBulkDelete}
                className="rounded-full px-4 h-9 text-[14px] font-semibold shadow-sm flex items-center gap-2"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                Delete {selectedIds.size}
              </Button>
            </>
          )}
        </div></>
      )}
    </div>
  );
}
