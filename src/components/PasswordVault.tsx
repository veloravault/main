/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { encryptText, decryptText } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { enrichPasswordMetadata, parseNotesToPasswords } from "@/app/actions";
import { getCache, setCache, invalidateCache } from "@/lib/vaultCache";
import { getStrength, getVaultHealthScore, findDuplicateIds } from "@/lib/passwordHealth";
import { useToast } from "@/components/Toast";
import { PasswordListSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronDownIcon, UploadIcon, TrashIcon, CheckSquareIcon, SquareIcon, StarIcon, MoreHorizontalIcon, PlusIcon } from "lucide-react";
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

export function PasswordVault({ masterPassword, focusedItemId }: { masterPassword: string, focusedItemId?: string | null }) {
  const toast = useToast();
  const [items, setItems] = useState<DecryptedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // New Item State
  const [newTitle, setNewTitle] = useState("");
  const [newSecret, setNewSecret] = useState("");

  // Bulk State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (focusedItemId) {
      setExpandedId(focusedItemId);
      setTimeout(() => {
        const el = document.getElementById(`item-${focusedItemId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [focusedItemId]);

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
      console.error("Error fetching vault items:", error);
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
        console.error(`Failed to decrypt item ${item.title}`, err);
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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newSecret) return;

    try {
      const encrypted = await encryptText(newSecret, masterPassword);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("No user found");

      // AI Categorization and Domain resolution
      const metadata = await enrichPasswordMetadata(newTitle);

      const { error } = await supabase.from("vault_items").insert({
        user_id: user.id,
        title: newTitle,
        encrypted_data: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
        category: metadata.category,
        domain: metadata.domain,
      });

      if (error) throw error;
      
      setNewTitle("");
      setNewSecret("");
      setIsAddOpen(false);
      invalidateCache("vault_items");
      fetchItems(true);
    } catch (err) {
      console.error("Failed to add item:", err);
      alert("Failed to encrypt and save the secret.");
    }
  };



  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this secret?")) return;
    const { error } = await supabase.from("vault_items").delete().eq("id", id);
    if (!error) {
      if (expandedId === id) setExpandedId(null);
      invalidateCache("vault_items");
      fetchItems(true);
      toast("Password deleted", "info");
    } else {
      toast("Failed to delete password", "error");
    }
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
    }
  };

  const copyToClipboard = (text: string, label = "Password") => {
    navigator.clipboard.writeText(text);
    toast(`${label} copied to clipboard`, "success");
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

          const newItems = [];
          let updatedCount = 0;

          for (const row of results.data as CsvPasswordRow[]) {
            // Find password and title in common CSV headers (1Password, Chrome, etc)
            const title = row.title || row.name || row.url || row.URL || "Imported Password";
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
            
            const duplicate = items.find(existing => {
              if (existing.title.toLowerCase() !== title.toLowerCase()) return false;
              const isCombo = existing.plaintext.startsWith("Username: ") && existing.plaintext.includes("\nPassword: ");
              const existingUsername = isCombo ? existing.plaintext.split("\n")[0].replace("Username: ", "").trim() : null;
              return (existingUsername || "").toLowerCase() === (parsedUsername || "").toLowerCase();
            });

            if (duplicate) {
              const { error } = await supabase.from("vault_items").update({
                encrypted_data: encrypted.ciphertext,
                iv: encrypted.iv,
                salt: encrypted.salt,
              }).eq("id", duplicate.id);
              if (!error) updatedCount++;
            } else {
              newItems.push({
                user_id: user.id,
                title,
                encrypted_data: encrypted.ciphertext,
                iv: encrypted.iv,
                salt: encrypted.salt,
                category: "Uncategorized",
                domain: null,
              });
            }
          }

          if (newItems.length > 0) {
            const { error } = await supabase.from("vault_items").insert(newItems);
            if (error) throw error;
          }
          
          if (newItems.length > 0 || updatedCount > 0) {
            invalidateCache("vault_items");
            fetchItems(true);
            alert(`Successfully imported ${newItems.length} new passwords and updated ${updatedCount} existing!`);
          } else {
            alert("No valid passwords found in the CSV. Make sure it has 'name' or 'url' and 'password' columns.");
          }
        } catch (error) {
          console.error("Import error:", error);
          alert("Failed to import passwords");
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      }
    });
  };

  const health = useMemo(() => getVaultHealthScore(items), [items]);
  const dupeIds = useMemo(() => findDuplicateIds(items), [items]);

  return (
    <div className="w-full relative pb-20">
      {/* Vault Health Banner */}
      {items.length >= 3 && (health.weak > 0 || health.reused > 0) && (
        <div className="mb-6 flex items-center gap-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-4">
          <div className="text-3xl font-bold text-amber-500">{health.score}</div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-foreground">Vault Health: {health.label}</div>
            <div className="text-[13px] text-muted-foreground mt-0.5">
              {health.weak > 0 && `${health.weak} weak password${health.weak > 1 ? 's' : ''}`}
              {health.weak > 0 && health.reused > 0 && ' · '}
              {health.reused > 0 && `${health.reused} reused password${health.reused > 1 ? 's' : ''}`}
            </div>
          </div>
          <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${health.score}%` }} />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8">
        <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight">Passwords</h2>
        
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full w-9 h-9 p-0 text-muted-foreground hover:bg-muted/80 flex items-center justify-center">
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

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger className="rounded-full h-9 px-4 sm:px-5 font-semibold text-[14px] flex items-center gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 outline-none">
              <PlusIcon className="w-4 h-4" />
              <span className="hidden min-[380px]:inline">New</span>
            </DialogTrigger>
            <DialogContent className="border-border/50 shadow-lg sm:rounded-[20px] max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center font-bold">New Password</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddItem} className="space-y-4 mt-2">
              <div className="space-y-1">
                <label className="text-[13px] text-muted-foreground ml-1 uppercase tracking-wider font-medium">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Netflix, Bank"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-[17px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[13px] text-muted-foreground ml-1 uppercase tracking-wider font-medium">Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={newSecret}
                  onChange={(e) => setNewSecret(e.target.value)}
                  className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-[17px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl font-semibold text-[17px] mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Save Password
              </Button>
            </form>
            </DialogContent>
          </Dialog>



          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleImportCSV} 
          />
        </div>
      </div>

      <div className="w-full">
        {loading ? (
          <PasswordListSkeleton />
        ) : items.length === 0 ? (
          <EmptyState type="passwords" onCta={() => setIsAddOpen(true)} />
        ) : (
          <motion.div layout className="space-y-7">
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
              <motion.div layout key={category} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

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

                {/* Inset grouped list card */}
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <AnimatePresence initial={false}>
                  {categoryItems
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map((item, idx, arr) => {
                      const isExpanded = expandedId === item.id;
                      const isSelected = selectedIds.has(item.id);
                      const s = getStrength(item.plaintext);

                      return (
                        <motion.div
                          layout
                          id={`item-${item.id}`}
                          key={item.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={idx < arr.length - 1 || isExpanded ? "border-b border-border" : ""}
                        >
                          {/* Row */}
                          <button
                            onClick={(e) => isSelectionMode ? toggleSelection(item.id, e) : setExpandedId(isExpanded ? null : item.id)}
                            className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                          >
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
                              {(() => {
                                const parsed = parsePlaintext(item.plaintext);
                                const faviconDomain = item.domain || parsed.domain;
                                if (!faviconDomain) return null;
                                return (
                                  <img
                                    src={`https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=64`}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-contain p-1.5 bg-white dark:bg-[#1c1c1e]"
                                    onError={e => { e.currentTarget.style.display = "none"; }}
                                  />
                                );
                              })()}
                            </div>

                            {/* Title + Subtitle */}
                            <div className="flex-1 min-w-0">
                              <div className="text-[15px] font-medium text-foreground truncate leading-snug">{item.title}</div>
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
                                <ChevronDownIcon
                                  className={`w-4 h-4 text-muted-foreground/60 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                  strokeWidth={2}
                                />
                              )}
                            </div>
                          </button>

                          {/* Expanded detail — Apple Passwords style */}
                          <AnimatePresence initial={false}>
                          {isExpanded && !isSelectionMode && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-1 space-y-3 bg-black/[0.015] dark:bg-white/[0.02]">
                                {/* Strength + dupe badges */}
                                <div className="flex items-center gap-2">
                                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.bg}/10 ${s.color}`}>
                                    {s.label}
                                  </span>
                                  {dupeIds.has(item.id) && (
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
                                      Reused
                                    </span>
                                  )}
                                  {/* Strength bar */}
                                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                    <div className={`h-full rounded-full ${s.bg} transition-all`} style={{ width: `${s.score}%` }} />
                                  </div>
                                  {/* Favorite toggle */}
                                  <button
                                    onClick={(e) => handleToggleFavorite(item.id, item.is_favorite, e)}
                                    className="text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                                  >
                                    <motion.div
                                      initial={false}
                                      animate={{ 
                                        scale: item.is_favorite ? [1, 1.3, 1] : 1,
                                        rotate: item.is_favorite ? [0, 15, -10, 0] : 0
                                      }}
                                      transition={{ duration: 0.4, ease: "easeOut" }}
                                    >
                                      <StarIcon
                                        className={`w-4 h-4 transition-colors ${item.is_favorite ? "fill-primary text-primary" : ""}`}
                                        strokeWidth={item.is_favorite ? 0 : 2}
                                      />
                                    </motion.div>
                                  </button>
                                </div>

                                {/* Password value & actions */}
                                {(() => {
                                  const parsed = parsePlaintext(item.plaintext);
                                  const { username, password, notes } = parsed;
                                  const hasStructured = parsed.isJson || username || password;

                                  if (hasStructured) {
                                    return (
                                      <div className="space-y-3">
                                        {username && (
                                          <div>
                                            <label className="text-[12px] text-muted-foreground uppercase tracking-wider font-semibold mb-1 block pl-1">Username</label>
                                            <div className="flex gap-2">
                                              <div className="flex-1 bg-secondary rounded-xl px-4 py-3 font-mono text-[15px] text-foreground tracking-wide break-all select-all border border-border/50">
                                                {username}
                                              </div>
                                              <button
                                                onClick={() => copyToClipboard(username, "Username")}
                                                className="px-4 rounded-xl font-semibold bg-secondary hover:bg-secondary/80 active:scale-[0.98] transition-all border border-border/50 text-foreground"
                                              >
                                                Copy
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                        {password && (
                                          <div>
                                            <label className="text-[12px] text-muted-foreground uppercase tracking-wider font-semibold mb-1 block pl-1">Password</label>
                                            <div className="flex gap-2">
                                              <div className="flex-1 bg-secondary rounded-xl px-4 py-3 font-mono text-[15px] text-foreground tracking-wide break-all select-all border border-border/50">
                                                {password}
                                              </div>
                                              <button
                                                onClick={() => copyToClipboard(password, "Password")}
                                                className="px-4 rounded-xl font-semibold bg-primary text-white hover:bg-primary/90 active:scale-[0.98] transition-all"
                                              >
                                                Copy
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                        {notes && (
                                          <div>
                                            <label className="text-[12px] text-muted-foreground uppercase tracking-wider font-semibold mb-1 block pl-1">Extra Details</label>
                                            <div className="flex gap-2">
                                              <div className="flex-1 bg-secondary rounded-xl px-4 py-3 font-mono text-[14px] text-foreground tracking-wide whitespace-pre-wrap break-words select-all border border-border/50">
                                                {notes}
                                              </div>
                                              <button
                                                onClick={() => copyToClipboard(notes, "Extra Details")}
                                                className="px-4 rounded-xl font-semibold bg-secondary hover:bg-secondary/80 active:scale-[0.98] transition-all border border-border/50 text-foreground"
                                              >
                                                Copy
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                        <div className="pt-2">
                                          <button
                                            onClick={(e) => handleDeleteItem(item.id, e)}
                                            className="w-full py-2.5 rounded-xl text-[15px] font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-[0.98] transition-all"
                                          >
                                            Delete Password
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <>
                                      <div className="w-full bg-secondary rounded-xl px-4 py-3 font-mono text-[15px] text-foreground tracking-wide break-all select-all border border-border/50 whitespace-pre-wrap">
                                        {item.plaintext}
                                      </div>
                                      <div className="flex gap-2 mt-4">
                                        <button
                                          onClick={() => copyToClipboard(item.plaintext)}
                                          className="flex-1 py-2.5 rounded-xl text-[15px] font-semibold bg-primary text-white hover:bg-primary/90 active:scale-[0.98] transition-all"
                                        >
                                          Copy Password
                                        </button>
                                        <button
                                          onClick={(e) => handleDeleteItem(item.id, e)}
                                          className="px-5 py-2.5 rounded-xl text-[15px] font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-[0.98] transition-all"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </motion.div>
                          )}
                          </AnimatePresence>
                        </motion.div>
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

      {/* Floating Action Bar for Bulk Selection */}
      {isSelectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-popover/80 backdrop-blur-xl border border-border shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 animate-in slide-in-from-bottom-8 duration-300 z-50">
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
        </div>
      )}
    </div>
  );
}
