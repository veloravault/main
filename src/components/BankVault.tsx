import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { encryptText, decryptText } from "@/lib/crypto";
import { setCache, getCache, invalidateCache } from "@/lib/vaultCache";
import { WalletSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import { Button } from "@/components/ui/button";
import { AdaptiveSheet, AdaptiveSheetBody, AdaptiveSheetFooter } from "@/components/ui/adaptive-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BuildingIcon, TrashIcon, CopyIcon, CameraIcon, Loader2Icon, MoreHorizontalIcon, CheckSquareIcon, SquareIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useOptimisticDelete } from "@/hooks/useOptimisticDelete";
import { copySensitiveText } from "@/lib/secureClipboard";
import { ContextActions } from "@/components/ui/context-actions";
import { vaultFetch } from "@/lib/authToken";

interface SecureWallet {
  id: string;
  title: string;
  type: string;
  encrypted_content: string;
  iv: string;
  salt: string;
}

interface DecryptedBank {
  id: string;
  title: string;
  type: "bank_account";
  payload: BankAccountPayload;
}

type BankAccountPayload = {
  routing?: string;
  account?: string;
  name?: string;
  extra_details?: string;
};

type ScanResponse = {
  data?: {
    number?: string;
    expiry?: string;
    cvv?: string;
    name?: string;
    routing?: string;
    account?: string;
  };
  error?: string;
};

export function BankVault({ masterPassword, focusedItemId, refreshVersion = 0 }: { masterPassword: string, focusedItemId?: string | null, refreshVersion?: number }) {
  const toast = useToast();
  const [items, setItems] = useState<DecryptedBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItemType] = useState<"bank_account">("bank_account");

  // Form State
  const [title, setTitle] = useState("");
  const [bankRouting, setBankRouting] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");

  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedBankId, setExpandedBankId] = useState<string | null>(null);
  const { scheduleDelete } = useOptimisticDelete({ items, setItems, toastLabel: (item) => item.title || "Bank account", commitDelete: async (item) => {
    const { error } = await supabase.from("secure_wallet").delete().eq("id", item.id);
    if (error) throw error;
    invalidateCache("secure_wallet_banks");
  } });

  useEffect(() => {
    if (focusedItemId) {
      setTimeout(() => {
        const el = document.getElementById(`item-${focusedItemId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [focusedItemId]);

  useEffect(() => {
    if (!expandedBankId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedBankId(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expandedBankId]);

  const typeText = async (text: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    setter("");
    for (let i = 0; i <= text.length; i++) {
      setter(text.slice(0, i));
      await new Promise(r => setTimeout(r, 30));
    }
  };

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const base64 = await readFileAsDataUrl(file);
      const res = await vaultFetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, type: newItemType })
      });
      const data = await res.json() as ScanResponse;
      
      if (data.error) throw new Error(data.error);
      if (!data.data) throw new Error("No data returned");
      
      if (data.data.routing) void typeText(data.data.routing, setBankRouting);
      if (data.data.account) void typeText(data.data.account, setBankAccount);
      if (data.data.name) void typeText(data.data.name, setBankName);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to scan image. Please try again.");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const fetchItems = useCallback(async () => {
    // Serve cache instantly — no skeleton flash on revisit
    const cached = getCache<DecryptedBank>("secure_wallet_banks");
    if (cached) { setItems(cached); setLoading(false); return; }

    setLoading(true);
    const { data, error } = await supabase
      .from("secure_wallet")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code !== "42P01" && error.code !== "PGRST205" && error.code !== "PGRST116") {
        console.warn("Error fetching wallet items:", JSON.stringify(error, null, 2));
      }
      setLoading(false);
      return;
    }

    const decryptedItems: DecryptedBank[] = [];
    for (const item of (data as SecureWallet[])) {
      if (item.type !== "bank_account") continue;
      try {
        const jsonStr = await decryptText(item.encrypted_content, item.salt, item.iv, masterPassword);
        decryptedItems.push({
          id: item.id,
          title: item.title,
          type: "bank_account",
          payload: JSON.parse(jsonStr) as BankAccountPayload,
        });
      } catch (err: unknown) {
        console.warn(`Failed to decrypt wallet item ${item.title}`, err);
      }
    }
    setItems(decryptedItems);
    setCache("secure_wallet_banks", decryptedItems);
    setLoading(false);
  }, [masterPassword]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchItems();
    });
  }, [fetchItems]);

  useEffect(() => {
    if (!refreshVersion) return;
    invalidateCache("secure_wallet_banks");
    queueMicrotask(() => void fetchItems());
  }, [fetchItems, refreshVersion]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const payload: BankAccountPayload = {
      routing: bankRouting,
      account: bankAccount,
      name: bankName,
    };

    try {
      const encrypted = await encryptText(JSON.stringify(payload), masterPassword);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("No user found");

      const { error } = await supabase.from("secure_wallet").insert({
        user_id: user.id,
        title,
        type: newItemType,
        encrypted_content: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
      });

      if (error) throw error;
      
      setTitle("");
      setBankName("");
      setBankRouting("");
      setBankAccount("");
      setIsAddOpen(false);
      invalidateCache("secure_wallet_banks");
      fetchItems();
    } catch (err) {
      console.error("Failed to add wallet item:", err);
      alert("Failed to save the wallet item. Make sure you ran the SQL migration.");
    }
  };

  const handleDeleteItem = (id: string, e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return;
    if (expandedBankId === id) setExpandedBankId(null);
    scheduleDelete(item);
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
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} accounts?`)) return;
    
    const idsToDelete = Array.from(selectedIds);
    const { error } = await supabase.from("secure_wallet").delete().in("id", idsToDelete);
    if (!error) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      invalidateCache("secure_wallet_banks");
      fetchItems();
    } else {
      alert("Failed to delete items");
    }
  };

  const copyToClipboard = async (text: string) => {
    const { scheduled } = await copySensitiveText(text);
    toast(`Copied${scheduled ? " and scheduled to clear" : ""}`, "success");
  };

  const selectedBank = items.find((item) => item.id === expandedBankId) ?? null;
  const accountType = selectedBank?.payload.extra_details
    ?.split("\n")
    .find((line) => /account\s*type/i.test(line))
    ?.split(":").slice(1).join(":").trim();

  return (
    <div className="apple-surface vault-material-scope w-full relative" style={{ perspective: "1500px" }}>
      <div className="vault-section-toolbar">
        <div className="vault-section-heading">
          <h2 className="type-section-title">Bank Accounts</h2>
        </div>
        
        <div className="vault-section-actions">
          {items.length > 0 && (
            <DropdownMenu>
            <DropdownMenuTrigger aria-label="More actions" className="vault-section-overflow rounded-full w-9 h-9 p-0 text-muted-foreground hover:bg-muted/80 flex items-center justify-center">
              <MoreHorizontalIcon className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              {items.length > 0 && (
                <>
                  <DropdownMenuItem 
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      if (isSelectionMode) setSelectedIds(new Set());
                    }}
                    className="font-medium cursor-pointer"
                  >
                    {isSelectionMode ? "Cancel Editing" : "Select Accounts"}
                  </DropdownMenuItem>
                  {isSelectionMode && (
                    <DropdownMenuItem 
                      onClick={() => {
                        if (selectedIds.size === items.length) {
                          setSelectedIds(new Set());
                        } else {
                          setSelectedIds(new Set(items.map(i => i.id)));
                        }
                      }}
                      className="font-medium cursor-pointer"
                    >
                      {selectedIds.size === items.length ? "Deselect All" : "Select All"}
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          )}

          <button type="button" onClick={() => setIsAddOpen(true)} className="vault-section-primary-action rounded-full h-9 px-3 sm:px-4 text-primary hover:bg-primary/10 hover:text-primary font-medium flex items-center gap-1.5 text-[14px] shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                Add Account
          </button>
          <AdaptiveSheet open={isAddOpen} onOpenChange={setIsAddOpen} title="New Bank Account" description="Scan or enter account details. Everything is encrypted before saving." size="md" className="vault-create-sheet">
            <form onSubmit={handleAddItem} className="vault-create-form">
            <AdaptiveSheetBody className="space-y-4">
            <div className="flex flex-col gap-2">
              <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              <Button 
                type="button" 
                variant="outline" 
                className="w-full border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary gap-2 h-10 rounded-xl"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
              >
                {isScanning ? (
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                ) : (
                  <CameraIcon className="w-4 h-4" />
                )}
                {isScanning ? "Scanning with AI..." : "Scan Document"}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[13px] text-muted-foreground ml-1 font-medium">Nickname / Title</label>
                <input
                  type="text"
                  placeholder="e.g. BoA Checking"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[13px] text-muted-foreground ml-1 font-medium">Routing Number</label>
                <input
                  type="text"
                  value={bankRouting}
                  onChange={(e) => setBankRouting(e.target.value)}
                  className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 font-mono text-[16px] tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[13px] text-muted-foreground ml-1 font-medium">Account Number</label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 font-mono text-[16px] tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[13px] text-muted-foreground ml-1 font-medium">Name on Account</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>

            </div>
            </AdaptiveSheetBody>
            <AdaptiveSheetFooter><Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button><Button type="submit" className="import-primary-action">Encrypt & Save</Button></AdaptiveSheetFooter>
            </form>
          </AdaptiveSheet>
        </div>
      </div>

      <div className="apple-master-detail apple-bank-master-detail apple-bank-workspace grid w-full items-start gap-5 md:grid-cols-[minmax(280px,0.82fr)_minmax(360px,1.18fr)] md:gap-6">
        {loading ? (
          <WalletSkeleton />
        ) : items.length === 0 ? (
          <EmptyState type="bank" onCta={() => setIsAddOpen(true)} />
        ) : (
          <motion.div layout="position" className="apple-bank-list apple-master-list flex flex-col gap-1" aria-label="Bank accounts">
            <AnimatePresence>
            {items.map((item) => (
              <ContextActions key={item.id} title={item.title} actions={[
                { id: "open", label: expandedBankId === item.id ? "Close details" : "View details", onSelect: () => setExpandedBankId(expandedBankId === item.id ? null : item.id) },
                { id: "copy", label: "Copy account number", disabled: !item.payload.account, onSelect: () => { if (item.payload.account) void copyToClipboard(item.payload.account); } },
                { id: "delete", label: "Delete", destructive: true, onSelect: () => { if (expandedBankId === item.id) setExpandedBankId(null); scheduleDelete(item); } },
              ]}>{(bindings) => <motion.div
                {...bindings}
                layout="position"
                id={`item-${item.id}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                key={item.id} 
              >
                  <button
                    type="button"
                    className={`w-full relative overflow-hidden group text-left px-3 py-3 min-h-[58px] rounded-[10px] transition-colors ${!expandedBankId || expandedBankId !== item.id ? 'hover:bg-black/5 dark:hover:bg-white/5' : ''} ${isSelectionMode && selectedIds.has(item.id) ? 'ring-2 ring-primary/30 bg-primary/5' : 'bg-transparent'}`}
                    onClick={(e) => {
                      if (isSelectionMode) toggleSelection(item.id, e); else setExpandedBankId(expandedBankId === item.id ? null : item.id);
                    }}
                    aria-expanded={expandedBankId === item.id}
                    aria-controls={`bank-detail-${item.id}`}
                  >
                    {expandedBankId === item.id && !isSelectionMode && (
                      <motion.div
                        layoutId="bank-active-bg"
                        className="absolute inset-0 bg-primary/10 rounded-[10px]"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                        style={{ zIndex: 0 }}
                      />
                    )}
                    {isSelectionMode && (
                      <div className="absolute top-4 left-4 z-20">
                        {selectedIds.has(item.id)
                          ? <CheckSquareIcon strokeWidth={2.5} className="w-5 h-5 text-primary" />
                          : <SquareIcon strokeWidth={2} className="w-5 h-5 text-muted-foreground opacity-50" />}
                      </div>
                    )}

                    <div className={`relative z-10 flex justify-between items-center ${isSelectionMode ? 'ml-8' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <BuildingIcon strokeWidth={2} className="w-5 h-5 text-primary" />
                        </div>
                        <div><span className={`type-row-title block ${expandedBankId === item.id ? 'text-primary' : ''}`}>{item.title}</span><span className="type-metadata text-muted-foreground">Account suffix ••••{(item.payload.account || "").slice(-4)} · IFSC / Routing {item.payload.routing || "—"}</span></div>
                      </div>
                      <ChevronRightIcon className={`h-5 w-5 ${expandedBankId === item.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>

                  </button>
              </motion.div>}
              </ContextActions>
            ))}
            </AnimatePresence>
          </motion.div>
        )}

        {selectedBank && (
          <>
            <button type="button" className="apple-bank-detail-backdrop" aria-label="Close account details" onClick={() => setExpandedBankId(null)} />
            <aside id={`bank-detail-${selectedBank.id}`} className="apple-bank-detail apple-detail-pane min-w-0" role="dialog" aria-labelledby={`bank-detail-title-${selectedBank.id}`}>
              <div className="apple-sheet-grabber" />
              <header className="flex items-center justify-between gap-4 px-1 pb-4">
                <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"><BuildingIcon className="h-5 w-5 text-primary" /></span><div className="min-w-0"><p className="type-group-label">Bank account</p><h3 id={`bank-detail-title-${selectedBank.id}`} className="mt-0.5 truncate text-[20px] font-semibold tracking-[-0.025em]">{selectedBank.title}</h3></div></div>
                <button type="button" aria-label="Close account details" onClick={() => setExpandedBankId(null)} className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground md:hidden"><XIcon className="h-4 w-4" /></button>
              </header>
              <div className="apple-bank-detail-fields overflow-hidden rounded-2xl border border-border/60 bg-background/55 px-4">
                {selectedBank.payload.name && <DetailRow label="Account Holder" value={selectedBank.payload.name} />}
                {accountType && <DetailRow label="Account Type" value={accountType} />}
                {selectedBank.payload.routing && <DetailRow label="IFSC / Routing Code" value={selectedBank.payload.routing} copy />}
                {selectedBank.payload.account && <DetailRow label="Account Number" value={selectedBank.payload.account} copy />}
              </div>
              {selectedBank.payload.extra_details && <div className="mt-3 rounded-2xl bg-muted/45 px-4 py-3"><p className="type-group-label mb-1.5">Additional Info</p><p className="whitespace-pre-wrap text-[13px] leading-5 text-muted-foreground">{selectedBank.payload.extra_details}</p></div>}
              <Button variant="ghost" onClick={(e) => handleDeleteItem(selectedBank.id, e)} className="mt-3 h-11 w-full rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"><TrashIcon className="h-4 w-4" /> Delete Account</Button>
            </aside>
          </>
        )}
      </div>
      {/* Floating Action Bar for Bulk Selection */}
      {isSelectionMode && selectedIds.size > 0 && (
        <><SelectionToolbar count={selectedIds.size} onCancel={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} onDelete={handleBulkDelete} /><div className="hidden md:flex fixed bottom-8 left-1/2 -translate-x-1/2 bg-popover/80 backdrop-blur-xl border border-border shadow-2xl rounded-2xl px-6 py-4 items-center gap-6 animate-in slide-in-from-bottom-8 duration-300 z-50">
          <span className="text-[15px] font-semibold text-foreground">
            {selectedIds.size} selected
          </span>
          <div className="w-px h-6 bg-border" />
          <Button 
            variant="destructive" 
            onClick={handleBulkDelete}
            className="rounded-full px-5 h-10 text-[15px] font-semibold shadow-sm flex items-center gap-2"
          >
            <TrashIcon className="w-4 h-4" />
            Delete
          </Button>
        </div></>
      )}
    </div>
  );

  function DetailRow({ label, value, copy = false }: { label: string; value: string; copy?: boolean }) {
    return <div className="flex min-h-[58px] items-center justify-between gap-4 border-b border-border/50 py-2.5 last:border-b-0"><div className="min-w-0"><p className="type-group-label">{label}</p><p className={`mt-1 truncate text-[15px] font-medium ${copy ? "font-mono tracking-[0.025em]" : ""}`}>{value}</p></div>{copy && <button type="button" aria-label={`Copy ${label}`} onClick={() => copyToClipboard(value)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary hover:bg-primary/15"><CopyIcon className="h-3.5 w-3.5" /></button>}</div>;
  }
}
