import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { encryptText, decryptText } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { enrichPasswordMetadata } from "@/app/actions";
import { getVaultAccessToken } from "@/lib/authToken";
import { getCache, setCache, invalidateCache } from "@/lib/vaultCache";
import { getStrength, getVaultHealthScore, findDuplicateIds } from "@/lib/passwordHealth";
import { useToast } from "@/components/Toast";
import { useOptimisticDelete } from "@/hooks/useOptimisticDelete";
import { copySensitiveText } from "@/lib/secureClipboard";
import { ContextActions } from "@/components/ui/context-actions";
import { PasswordListSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import Papa from "papaparse";
import { AdaptiveSheet, AdaptiveSheetBody, AdaptiveSheetFooter } from "@/components/ui/adaptive-sheet";
import { ChevronRightIcon, UploadIcon, TrashIcon, CheckSquareIcon, SquareIcon, StarIcon, MoreHorizontalIcon, PlusIcon, XIcon, CopyIcon, EyeIcon, EyeOffIcon, TriangleAlertIcon, ShieldAlertIcon, KeyRoundIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VaultItem {
  id: string;
  title: string;
  encrypted_data: string;
  iv: string;
  salt: string;
  category: string;
  domain: string | null;
  is_favorite: boolean;
}

interface DecryptedItem {
  id: string;
  title: string;
  plaintext: string;
  category: string;
  domain: string | null;
  is_favorite: boolean;
}

type CsvPasswordRow = Record<string, string | undefined>;

// Best-effort hostname extraction from a CSV "url" column, for favicon lookup.
function extractDomain(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(withProtocol).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

// Parses plaintext stored in vault_items — supports JSON (Magic Import) and legacy text format
function parsePlaintext(plaintext: string): { isJson: boolean; username: string | null; password: string | null; notes: string | null; domain: string | null } {
  try {
    const obj = JSON.parse(plaintext);
    if (obj && typeof obj === 'object') {
      return {
        isJson: true,
        username: (obj.username && obj.username !== '') ? obj.username : (obj.user && obj.user !== '') ? obj.user : (obj.email && obj.email !== '') ? obj.email : null,
        password: (obj.password && obj.password !== '') ? obj.password : (obj.pass && obj.pass !== '') ? obj.pass : null,
        notes: obj.notes || obj.extra_details || null,
        domain: obj.domain || null,
      };
    }
  } catch {
    // not JSON — fall through to regex
  }
  const userMatch = plaintext.match(/Username:\s*([^\n]+)/i);
  const passMatch = plaintext.match(/Password:\s*([^\n]+)/i);
  let extra = plaintext;
  if (userMatch) extra = extra.replace(userMatch[0], '');
  if (passMatch) extra = extra.replace(passMatch[0], '');
  return {
    isJson: false,
    username: userMatch ? userMatch[1].trim() : null,
    password: passMatch ? passMatch[1].trim() : null,
    notes: extra.trim() || null,
    domain: null,
  };
}

export function PasswordVault({ masterPassword, focusedItemId, refreshVersion = 0 }: { masterPassword: string, focusedItemId?: string | null, refreshVersion?: number }) {
  const toast = useToast();
  const [items, setItems] = useState<DecryptedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  
  // New Item State
  const [newTitle, setNewTitle] = useState("");
  const [newSecret, setNewSecret] = useState("");
  const [showNewSecret, setShowNewSecret] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);

  // Bulk State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Large vaults: render (and animate) a bounded number of rows per category
  // rather than the whole list at once. Data is still fetched and decrypted
  // in full up front — this only limits what actually hits the DOM.
  const CATEGORY_PAGE_SIZE = 40;
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const { scheduleDelete } = useOptimisticDelete({ items, setItems, toastLabel: (item) => item.title || "Password", commitDelete: async (item) => {
    const { error } = await supabase.from("vault_items").delete().eq("id", item.id);
    if (error) throw error;
    invalidateCache("vault_items");
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



  useEffect(() => {
    if (!expandedId) return;
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setExpandedId(null); setRevealedIds(new Set()); }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expandedId]);

  const fetchItems = useCallback(async (force = false) => {
    // Check cache first
    if (!force) {
      const cached = getCache<DecryptedItem>("vault_items");
      if (cached) { setItems(cached); setLoading(false); return; }
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("vault_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Error fetching vault items:", error);
      setLoading(false);
      return;
    }

    const decryptedItems: DecryptedItem[] = [];
    for (const item of (data as VaultItem[])) {
      try {
        const plaintext = await decryptText(
          item.encrypted_data,
          item.salt,
          item.iv,
          masterPassword
        );
        decryptedItems.push({
          id: item.id,
          title: item.title,
          plaintext,
          category: item.category || "Uncategorized",
          domain: item.domain || null,
          is_favorite: !!item.is_favorite,
        });
      } catch (err: unknown) {
        console.warn(`Failed to decrypt item ${item.title}`, err);
        decryptedItems.push({
          id: item.id,
          title: item.title,
          plaintext: "Decryption Failed",
          category: item.category || "Uncategorized",
          domain: item.domain || null,
          is_favorite: !!item.is_favorite,
        });
      }
    }
    setCache("vault_items", decryptedItems);
    setItems(decryptedItems);
    setLoading(false);
  }, [masterPassword]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchItems();
    });
  }, [fetchItems]);

  useEffect(() => {
    if (!refreshVersion) return;
    invalidateCache("vault_items");
    queueMicrotask(() => void fetchItems(true));
  }, [fetchItems, refreshVersion]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSecret.trim()) {
      setAddItemError("Add a title and a password before saving.");
      return;
    }
    setAddItemError(null);

    try {
      const encrypted = await encryptText(newSecret, masterPassword);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("No user found");

      // AI Categorization and Domain resolution
      const metadata = await enrichPasswordMetadata(await getVaultAccessToken(), newTitle);

      const { error } = await supabase.from("vault_items").insert({
        user_id: user.id,
        title: newTitle,
        encrypted_data: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
        category: metadata.category,
        domain: extractDomain(metadata.domain ?? undefined),
      });

      if (error) throw error;
      
      setNewTitle("");
      setNewSecret("");
      setShowNewSecret(false);
      setIsAddOpen(false);
      invalidateCache("vault_items");
      fetchItems(true);
    } catch (err) {
      console.error("Failed to add item:", err);
      toast("Failed to encrypt and save the secret.", "error");
    }
  };



  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return;
    if (expandedId === id) setExpandedId(null);
    scheduleDelete(item);
  };

  const handleToggleFavorite = async (id: string, currentState: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase
      .from("vault_items")
      .update({ is_favorite: !currentState })
      .eq("id", id);
      
    if (!error) {
      setItems(items.map(item => item.id === id ? { ...item, is_favorite: !currentState } : item));
      invalidateCache("vault_items");
    } else {
      toast("Failed to update favorite", "error");
    }
  };

  const copyToClipboard = async (text: string, label = "Password") => {
    const { scheduled } = await copySensitiveText(text);
    toast(`${label} copied${scheduled ? " and scheduled to clear" : ""}`, "success");
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
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) return;
    
    const idsToDelete = Array.from(selectedIds);
    const { error } = await supabase.from("vault_items").delete().in("id", idsToDelete);
    if (!error) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      invalidateCache("vault_items");
      fetchItems(true);
      toast(`${idsToDelete.length} passwords deleted`, "info");
    } else {
      toast("Failed to delete items", "error");
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("No user found");

          const newItems: { user_id: string; title: string; encrypted_data: string; iv: string; salt: string; category: string; domain: string | null }[] = [];
          const newItemUsernames: (string | null)[] = [];
          let updatedCount = 0;

          for (const row of results.data as CsvPasswordRow[]) {
            // Find password and title in common CSV headers (1Password, Chrome, etc)
            const title = row.title || row.name || row.url || row.URL || "Imported Password";
            const domain = extractDomain(row.url || row.URL);
            const password = row.password || row.Password;
            const rawUsername = row.username || row.Username || row.login || row.Login || row.email || row.Email;
            const parsedUsername = rawUsername ? rawUsername.trim() : null;

            if (!password) continue;

            let secretText = "";
            if (parsedUsername) {
               secretText = `Username: ${parsedUsername}\nPassword: ${password}`;
            } else {
               secretText = password;
            }

            const encrypted = await encryptText(secretText, masterPassword);

            // Only match on a real, non-empty username on both sides — matching
            // on "both blank" would treat any two unrelated same-titled items
            // (e.g. a manually-added password with no username) as duplicates
            // and silently overwrite one with the other.
            const duplicate = parsedUsername
              ? items.find(existing => {
                  if (existing.title.toLowerCase() !== title.toLowerCase()) return false;
                  const isCombo = existing.plaintext.startsWith("Username: ") && existing.plaintext.includes("\nPassword: ");
                  const existingUsername = isCombo ? existing.plaintext.split("\n")[0].replace("Username: ", "").trim() : null;
                  return !!existingUsername && existingUsername.toLowerCase() === parsedUsername.toLowerCase();
                })
              : undefined;

            if (duplicate) {
              const { error } = await supabase.from("vault_items").update({
                encrypted_data: encrypted.ciphertext,
                iv: encrypted.iv,
                salt: encrypted.salt,
              }).eq("id", duplicate.id);
              if (!error) updatedCount++;
              continue;
            }

            // Also check against rows already staged earlier in this same CSV
            // so two identical rows in one file merge instead of both inserting.
            const batchIndex = parsedUsername
              ? newItems.findIndex((candidate, index) =>
                  candidate.title.toLowerCase() === title.toLowerCase()
                  && newItemUsernames[index]?.toLowerCase() === parsedUsername.toLowerCase())
              : -1;

            if (batchIndex >= 0) {
              newItems[batchIndex] = { ...newItems[batchIndex], encrypted_data: encrypted.ciphertext, iv: encrypted.iv, salt: encrypted.salt, domain };
            } else {
              newItems.push({
                user_id: user.id,
                title,
                encrypted_data: encrypted.ciphertext,
                iv: encrypted.iv,
                salt: encrypted.salt,
                category: "Uncategorized",
                domain,
              });
              newItemUsernames.push(parsedUsername);
            }
          }

          if (newItems.length > 0) {
            const { error } = await supabase.from("vault_items").insert(newItems);
            if (error) throw error;
          }
          
          if (newItems.length > 0 || updatedCount > 0) {
            invalidateCache("vault_items");
            fetchItems(true);
            toast(`Imported ${newItems.length} new passwords and updated ${updatedCount} existing`, "success");
          } else {
            toast("No valid passwords found in the CSV. Make sure it has 'name' or 'url' and 'password' columns.", "error");
          }
        } catch (error) {
          console.error("Import error:", error);
          toast("Failed to import passwords", "error");
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      }
    });
  };

  const health = useMemo(() => getVaultHealthScore(items), [items]);
  const dupeIds = useMemo(() => findDuplicateIds(items), [items]);
  const selectedItem = useMemo(() => items.find((item) => item.id === expandedId) ?? null, [items, expandedId]);

  const renderPasswordDetail = (item: DecryptedItem) => {
    const parsed = parsePlaintext(item.plaintext);
    const strength = getStrength(item.plaintext);
    const password = parsed.password || (!parsed.isJson && !parsed.username && item.plaintext !== "Decryption Failed" ? item.plaintext : null);

    const DetailValue = ({ label, value, copyLabel = label, concealed = false }: { label: string; value: string; copyLabel?: string; concealed?: boolean }) => (
      <div className="group flex flex-col py-3.5 px-5 bg-background hover:bg-secondary/60 transition-colors relative">
        <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</span>
        <div className="flex items-center justify-between gap-4">
          <span className={`text-[16px] font-medium text-foreground truncate ${concealed ? "font-mono tracking-wide" : ""}`}>
            {concealed && !revealedIds.has(item.id) ? "••••••••••••" : value}
          </span>
          <span className="flex shrink-0 items-center -mr-2">
            {concealed && <button type="button" onClick={() => setRevealedIds((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} className="flex items-center justify-center w-11 h-11 -my-3 text-muted-foreground/40 hover:text-primary active:text-primary transition-colors" aria-label={revealedIds.has(item.id) ? "Hide password" : "Show password"}>{revealedIds.has(item.id) ? <EyeOffIcon className="w-[18px] h-[18px]" /> : <EyeIcon className="w-[18px] h-[18px]" />}</button>}
            <button type="button" onClick={() => copyToClipboard(value, copyLabel)} className="flex items-center justify-center w-11 h-11 -my-3 text-muted-foreground/40 hover:text-primary active:text-primary transition-colors" aria-label={`Copy ${label.toLowerCase()}`}>
              <CopyIcon className="w-[18px] h-[18px]" />
            </button>
          </span>
        </div>
      </div>
    );

    const isReused = dupeIds.has(item.id);
    const isWeak = strength.level === "weak" || strength.level === "fair";
    const advisory = isReused
      ? "This password is used on another account. Change it so a single leak can't expose both."
      : isWeak
      ? "This password is easy to guess. Consider replacing it with something longer and more random."
      : null;

    return (
      <motion.aside
        key={item.id}
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-detail-title"
        initial={isDesktop ? { opacity: 0, y: 10 } : { opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={isDesktop ? { opacity: 0, y: 10 } : { opacity: 0, y: "100%" }}
        transition={isDesktop ? { type: "spring", damping: 28, stiffness: 260 } : { type: "spring", damping: 30, stiffness: 240 }}
        className="apple-password-detail apple-detail-pane min-w-0 flex flex-col"
      >
          {/* Top Actions: Favorite & Close */}
          <div className="absolute top-4 right-4 flex items-center gap-1 z-10">
            <button type="button" onClick={(e) => handleToggleFavorite(item.id, item.is_favorite, e)} className="flex items-center justify-center w-11 h-11 text-muted-foreground hover:text-primary active:bg-background/50 transition-colors rounded-full" aria-label="Toggle favorite">
              <StarIcon className={`w-5 h-5 ${item.is_favorite ? "fill-primary text-primary" : ""}`} />
            </button>
            <button type="button" onClick={() => { setExpandedId(null); setRevealedIds(new Set()); }} className="flex items-center justify-center w-11 h-11 text-muted-foreground hover:text-foreground active:bg-background/50 transition-colors rounded-full md:hidden" aria-label="Close password details">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile drag indicator */}
          <div className="apple-sheet-grabber" />

          {/* Profile-like Header */}
          <div className="flex flex-col items-center pt-8 md:pt-10 pb-6 px-6">
            <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center text-[36px] font-bold text-primary shadow-sm mb-4 relative overflow-hidden shrink-0">
              {item.title.charAt(0).toUpperCase()}
              {item.domain && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://unavatar.io/${item.domain}?fallback=false`}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain bg-white dark:bg-transparent"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
            </div>
            <h3 id="password-detail-title" className="text-[24px] font-bold tracking-tight text-foreground text-center leading-tight mb-1">{item.title}</h3>
          </div>

          {/* Fields */}
          <div className="px-5 pb-8">
            {advisory && (
              <div className={`flex items-start gap-2.5 mb-4 px-4 py-3 rounded-[18px] ${isReused ? "bg-red-500/10" : "bg-amber-500/10"}`}>
                <TriangleAlertIcon className={`w-[18px] h-[18px] mt-0.5 shrink-0 ${isReused ? "text-red-500" : "text-amber-500"}`} />
                <p className={`text-[13.5px] leading-snug font-medium ${isReused ? "text-red-500" : "text-amber-500"}`}>{advisory}</p>
              </div>
            )}
            <div className="flex flex-col gap-[1px] bg-border/50 rounded-[24px] overflow-hidden shadow-sm ring-1 ring-border/50">
              {parsed.username && <DetailValue label="Username" value={parsed.username} />}
              {password && <DetailValue label="Password" value={password} concealed />}
              {parsed.notes && <DetailValue label="Notes" value={parsed.notes} copyLabel="Notes" />}
            </div>

            <div className="mt-6 rounded-[24px] overflow-hidden shadow-sm ring-1 ring-border/50">
              <button type="button" onClick={(e) => handleDeleteItem(item.id, e)} className="w-full py-4 bg-background hover:bg-secondary/60 active:scale-[0.98] transition-all text-center text-destructive text-[16px] font-medium">
                Delete Password
              </button>
            </div>
          </div>
      </motion.aside>
    );
  };

  return (
    <div className="apple-surface vault-material-scope w-full relative pb-20">
      {/* Security Recommendations */}
      {items.length >= 3 && (health.weak > 0 || health.reused > 0) && (
        <button
          type="button"
          onClick={() => {
            const flagged = items.find((item) => dupeIds.has(item.id) || getStrength(item.plaintext).level === "weak" || getStrength(item.plaintext).level === "fair");
            if (flagged) setExpandedId(flagged.id);
          }}
          className="w-full mb-6 flex items-center gap-3.5 bg-secondary/60 hover:bg-secondary rounded-[18px] px-4 py-3.5 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-[10px] bg-amber-500 flex items-center justify-center shrink-0">
            <ShieldAlertIcon className="w-5 h-5 text-white" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-foreground">Security Recommendations</div>
            <div className="text-[13px] text-muted-foreground mt-0.5 truncate">
              {health.weak > 0 && `${health.weak} weak password${health.weak > 1 ? 's' : ''}`}
              {health.weak > 0 && health.reused > 0 && ' · '}
              {health.reused > 0 && `${health.reused} reused password${health.reused > 1 ? 's' : ''}`}
            </div>
          </div>
          <ChevronRightIcon className="w-4 h-4 text-muted-foreground/60 shrink-0" strokeWidth={2} />
        </button>
      )}
      <div className="vault-section-toolbar">
        <div className="vault-section-heading">
          <h2 className="type-section-title">Passwords</h2>
        </div>
        
        <div className="vault-section-actions">
          {items.length > 0 && (
            <DropdownMenu>
            <DropdownMenuTrigger aria-label="More actions" className="vault-section-overflow rounded-full w-9 h-9 p-0 text-muted-foreground hover:bg-muted/80 flex items-center justify-center">
              <MoreHorizontalIcon className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              {items.length > 0 && (
                <DropdownMenuItem 
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    if (isSelectionMode) setSelectedIds(new Set());
                  }}
                  className="font-medium cursor-pointer"
                >
                  {isSelectionMode ? "Cancel Editing" : "Select Passwords"}
                </DropdownMenuItem>
              )}
              {isSelectionMode && items.length > 0 && (
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
              <DropdownMenuItem 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="font-medium cursor-pointer"
              >
                <UploadIcon className="w-4 h-4 mr-2" />
                {isImporting ? "Importing CSV..." : "Import CSV"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}

          <button type="button" onClick={() => setIsAddOpen(true)} className="vault-section-primary-action rounded-full h-9 px-4 sm:px-5 font-semibold text-[14px] flex items-center gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 outline-none">
              <PlusIcon className="w-4 h-4" />
              <span className="hidden min-[380px]:inline">New</span>
          </button>
          <AdaptiveSheet open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) { setShowNewSecret(false); setAddItemError(null); } }} title="New Password" description="Add a credential encrypted with your existing master key." size="sm" className="vault-create-sheet">
            <form onSubmit={handleAddItem} noValidate className="vault-create-form">
            <AdaptiveSheetBody>
              <div className="rounded-2xl border border-border/60 bg-secondary/60 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/50">
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Netflix, Bank"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-transparent text-[17px] text-foreground focus:outline-none"
                    required
                  />
                </div>
                <div className="px-4 py-3">
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Password</label>
                  <div className="flex items-center gap-2">
                    <input
                      type={showNewSecret ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={newSecret}
                      onChange={(e) => setNewSecret(e.target.value)}
                      className="w-full bg-transparent text-[17px] font-mono tracking-wide text-foreground focus:outline-none"
                      required
                    />
                    <button type="button" onClick={() => setShowNewSecret((v) => !v)} className="flex items-center justify-center w-11 h-11 -my-3 -mr-2 shrink-0 text-muted-foreground/50 hover:text-primary active:text-primary transition-colors" aria-label={showNewSecret ? "Hide password" : "Show password"}>
                      {showNewSecret ? <EyeOffIcon className="w-[18px] h-[18px]" /> : <EyeIcon className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                </div>
              </div>
              {addItemError && <p className="text-[13px] text-destructive mt-3 px-1" role="alert">{addItemError}</p>}
            </AdaptiveSheetBody>
            <AdaptiveSheetFooter><Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button><Button type="submit" className="import-primary-action">Save Password</Button></AdaptiveSheetFooter>
            </form>
          </AdaptiveSheet>



          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleImportCSV} 
          />
        </div>
      </div>

      <div className="apple-master-detail apple-password-master-detail grid w-full items-start gap-5 md:grid-cols-[minmax(280px,0.82fr)_minmax(360px,1.18fr)] md:gap-6">
        {loading ? (
          <PasswordListSkeleton />
        ) : items.length === 0 ? (
          <EmptyState type="passwords" onCta={() => setIsAddOpen(true)} />
        ) : (
          <motion.div layout="position" data-password-master className="apple-password-list apple-master-list space-y-7">
            <AnimatePresence>
            {Object.entries(
              items.reduce((acc, item) => {
                const cat = item.is_favorite ? "Favorites" : item.category;
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
              }, {} as Record<string, DecryptedItem[]>)
            ).sort(([a], [b]) => {
              if (a === "Favorites") return -1;
              if (b === "Favorites") return 1;
              return a.localeCompare(b);
            }).map(([category, categoryItems]) => (
              <motion.div layout="position" key={category} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                {/* Section header */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
                    {category}
                  </p>
                  {isSelectionMode && (
                    <button
                      onClick={() => {
                        const allInCategorySelected = categoryItems.every(i => selectedIds.has(i.id));
                        const newSet = new Set(selectedIds);
                        if (allInCategorySelected) {
                          categoryItems.forEach(i => newSet.delete(i.id));
                        } else {
                          categoryItems.forEach(i => newSet.add(i.id));
                        }
                        setSelectedIds(newSet);
                      }}
                      className="text-[12px] font-semibold text-primary hover:opacity-80 transition-opacity"
                    >
                      {categoryItems.every(i => selectedIds.has(i.id)) ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>

                {/* Master list container */}
                <div className="flex flex-col gap-1">
                  <AnimatePresence initial={false}>
                  {categoryItems
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .slice(0, expandedCategories.has(category) ? undefined : CATEGORY_PAGE_SIZE)
                    .map((item) => {
                      const isExpanded = expandedId === item.id;
                      const isSelected = selectedIds.has(item.id);
                      const s = getStrength(item.plaintext);

                      const parsedForActions = parsePlaintext(item.plaintext);
                      return (
                        <ContextActions key={item.id} title={item.title} actions={[
                          { id: "open", label: isExpanded ? "Close details" : "View details", onSelect: () => setExpandedId(isExpanded ? null : item.id) },
                          { id: "copy", label: "Copy password", onSelect: () => void copyToClipboard(parsedForActions.password ?? item.plaintext) },
                          { id: "favorite", label: item.is_favorite ? "Remove favorite" : "Add favorite", onSelect: () => void supabase.from("vault_items").update({ is_favorite: !item.is_favorite }).eq("id", item.id).then(({ error }) => { if (!error) { setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, is_favorite: !item.is_favorite } : candidate)); invalidateCache("vault_items"); } }) },
                          { id: "delete", label: "Delete", destructive: true, onSelect: () => { if (expandedId === item.id) setExpandedId(null); scheduleDelete(item); } },
                        ]}>{(bindings) => <motion.div
                          {...bindings}
                          layout="position"
                          id={`item-${item.id}`}
                          key={item.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className=""
                        >
                          {/* Row */}
                          <button
                            key="row-btn"
                            onClick={(e) => isSelectionMode ? toggleSelection(item.id, e) : setExpandedId(isExpanded ? null : item.id)}
                            className={`relative w-full text-left overflow-hidden rounded-[10px] bg-transparent group transition-colors ${!isExpanded || expandedId !== item.id ? 'hover:bg-black/5 dark:hover:bg-white/5' : ''} ${isSelectionMode && isSelected ? 'ring-2 ring-primary/30 bg-primary/5' : ''}`}
                          >
                            {isExpanded && !isSelectionMode && (
                              <motion.div
                                layoutId="password-active-bg"
                                className="absolute inset-0 bg-primary/10 rounded-[10px]"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                style={{ zIndex: 0 }}
                              />
                            )}
                            <div className="relative z-10 flex items-center gap-3 w-full px-4 py-3">
                            {/* Selection checkbox */}
                            {isSelectionMode && (
                              <div className="shrink-0 text-primary">
                                {isSelected
                                  ? <CheckSquareIcon strokeWidth={2.5} className="w-5 h-5" />
                                  : <SquareIcon strokeWidth={2} className="w-5 h-5 text-muted-foreground/50" />}
                              </div>
                            )}

                            {/* Favicon icon */}
                            <div className="w-10 h-10 rounded-[10px] bg-secondary flex items-center justify-center shrink-0 border border-border overflow-hidden relative">
                              <span className="text-[17px] font-bold text-foreground/50">
                                {item.title.charAt(0).toUpperCase()}
                              </span>
                              {item.domain && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={`https://unavatar.io/${item.domain}?fallback=false`}
                                  alt=""
                                  className="absolute inset-0 w-full h-full object-contain bg-white dark:bg-transparent"
                                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                                />
                              )}
                              {(dupeIds.has(item.id) || s.level === "weak" || s.level === "fair") && (
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${dupeIds.has(item.id) || s.level === "weak" ? "bg-red-500" : "bg-amber-500"}`}
                                  aria-hidden="true"
                                />
                              )}
                            </div>

                            {/* Title + Subtitle */}
                            <div className="flex-1 min-w-0">
                              <div className={`text-[15px] font-medium truncate leading-snug ${isExpanded ? 'text-primary' : 'text-foreground'}`}>{item.title}</div>
                              {(() => {
                                const parsed = parsePlaintext(item.plaintext);
                                const subtitle = parsed.username;
                                return (
                                  <div className={`text-[13px] text-muted-foreground truncate leading-tight mt-0.5 ${!subtitle ? 'tracking-[0.18em]' : ''}`}>
                                    {subtitle || "••••••••"}
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Right accessories */}
                            <div className="flex items-center gap-2 shrink-0">
                              {item.is_favorite && (
                                <StarIcon className="w-3.5 h-3.5 fill-primary text-primary" />
                              )}
                              {!isSelectionMode && (
                                <ChevronRightIcon
                                  className={`w-4 h-4 ${isExpanded ? 'text-primary' : 'text-muted-foreground/60'}`}
                                  strokeWidth={2}
                                />
                              )}
                            </div>
                            </div>
                          </button>
                        </motion.div>}
                        </ContextActions>
                      );
                    })}
                  </AnimatePresence>
                  {categoryItems.length > CATEGORY_PAGE_SIZE && !expandedCategories.has(category) && (
                    <button
                      type="button"
                      onClick={() => setExpandedCategories((current) => new Set(current).add(category))}
                      className="mt-1 py-2.5 text-[13px] font-semibold text-primary hover:opacity-80 transition-opacity text-center"
                    >
                      Show {categoryItems.length - CATEGORY_PAGE_SIZE} more
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </motion.div>
        )}

        <AnimatePresence>
          {!!selectedItem && !isSelectionMode && (
            <motion.button
              key="password-detail-backdrop"
              type="button"
              className="apple-password-detail-backdrop"
              aria-label="Close password details"
              onClick={() => { setExpandedId(null); setRevealedIds(new Set()); }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {!loading && items.length > 0 && !isSelectionMode && (
          selectedItem ? (
            <AnimatePresence mode="wait">{renderPasswordDetail(selectedItem)}</AnimatePresence>
          ) : (
            <aside className="apple-password-detail apple-detail-pane min-w-0 hidden md:flex flex-col items-center justify-center text-center py-20 px-6">
              <KeyRoundIcon className="w-9 h-9 text-muted-foreground/30 mb-3" strokeWidth={1.25} />
              <p className="text-[15px] font-medium text-foreground/70">Select a password</p>
              <p className="text-[13px] text-muted-foreground mt-1 max-w-[220px] leading-relaxed">Choose an item from the list to view its details.</p>
            </aside>
          )
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
}
