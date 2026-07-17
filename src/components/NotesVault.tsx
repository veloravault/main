import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { encryptText, decryptText } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { CardListSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import { AdaptiveSheet, AdaptiveSheetBody, AdaptiveSheetFooter } from "@/components/ui/adaptive-sheet";
import { ChevronDownIcon, ChevronRightIcon, FileIcon, MoreHorizontalIcon, PlusIcon, CheckSquareIcon, SquareIcon, TrashIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { categorizeNote } from "@/app/actions";
import { getVaultAccessToken } from "@/lib/authToken";
import { setCache, getCache, invalidateCache } from "@/lib/vaultCache";
import { useToast } from "@/components/Toast";
import { useOptimisticDelete } from "@/hooks/useOptimisticDelete";
import { copySensitiveText } from "@/lib/secureClipboard";
import { ContextActions } from "@/components/ui/context-actions";

interface SecureNote {
  id: string;
  title: string;
  encrypted_content: string;
  iv: string;
  salt: string;
  category?: string;
}

interface DecryptedNote {
  id: string;
  title: string;
  plaintext: string;
  category?: string;
}

export function NotesVault({ masterPassword, focusedItemId, refreshVersion = 0 }: { masterPassword: string, focusedItemId?: string | null, refreshVersion?: number }) {
  const toast = useToast();
  const [items, setItems] = useState<DecryptedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // New Item State
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  // Bulk State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { scheduleDelete } = useOptimisticDelete({ items, setItems, toastLabel: (item) => item.title || "Note", commitDelete: async (item) => {
    const { error } = await supabase.from("secure_notes").delete().eq("id", item.id);
    if (error) throw error;
    invalidateCache("secure_notes");
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

  const fetchItems = useCallback(async () => {
    // Serve cache instantly — no skeleton flash on repeat visits
    const cached = getCache<DecryptedNote>("secure_notes");
    if (cached) { setItems(cached); setLoading(false); return; }

    setLoading(true);
    const { data, error } = await supabase
      .from("secure_notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Error fetching secure notes:", error);
      setLoading(false);
      return;
    }

    const decryptedItems: DecryptedNote[] = [];
    for (const item of (data as SecureNote[])) {
      try {
        const plaintext = await decryptText(
          item.encrypted_content,
          item.salt,
          item.iv,
          masterPassword
        );
        decryptedItems.push({
          id: item.id,
          title: item.title,
          plaintext,
          category: item.category,
        });
      } catch (err: unknown) {
        console.warn(`Failed to decrypt note ${item.title}`, err);
        decryptedItems.push({
          id: item.id,
          title: item.title,
          plaintext: "Decryption Failed",
        });
      }
    }
    setItems(decryptedItems);
    setCache("secure_notes", decryptedItems);
    setLoading(false);
  }, [masterPassword]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchItems();
    });
  }, [fetchItems]);

  useEffect(() => {
    if (!refreshVersion) return;
    invalidateCache("secure_notes");
    queueMicrotask(() => void fetchItems());
  }, [fetchItems, refreshVersion]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;

    try {
      const encrypted = await encryptText(newContent, masterPassword);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("No user found");

      const category = await categorizeNote(await getVaultAccessToken(), newTitle);

      const { error } = await supabase.from("secure_notes").insert({
        user_id: user.id,
        title: newTitle,
        encrypted_content: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
        category: category,
      }).select().single();

      if (error) throw error;
      
      setNewTitle("");
      setNewContent("");
      setIsAddOpen(false);
      invalidateCache("secure_notes");
      fetchItems();
    } catch (err) {
      console.error("Failed to add note:", err);
      toast("Failed to encrypt and save the note.", "error");
    }
  };



  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return;
    if (expandedId === id) setExpandedId(null);
    scheduleDelete(item);
  };

  const copyToClipboard = async (text: string) => {
    const { scheduled } = await copySensitiveText(text);
    toast(`Note copied${scheduled ? " and scheduled to clear" : ""}`, "success");
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
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} notes?`)) return;
    const idsToDelete = Array.from(selectedIds);
    const { error } = await supabase.from("secure_notes").delete().in("id", idsToDelete);
    if (!error) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      invalidateCache("secure_notes");
      fetchItems();
    } else {
      toast("Failed to delete items", "error");
    }
  };

  return (
    <div className="apple-surface vault-material-scope w-full">
      <div className="vault-section-toolbar">
        <div className="vault-section-heading">
          <h2 className="type-section-title">Secure Notes</h2>
          {isSelectionMode && (
            <span className="text-[13px] font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
              {selectedIds.size} selected
            </span>
          )}
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
                    {isSelectionMode ? "Cancel Editing" : "Select Notes"}
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

          <button type="button" onClick={() => setIsAddOpen(true)} className="vault-section-primary-action rounded-full h-9 px-4 sm:px-5 font-semibold text-[14px] flex items-center gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 outline-none">
              <PlusIcon className="w-4 h-4" />
              <span className="hidden min-[380px]:inline">New</span>
          </button>
          <AdaptiveSheet open={isAddOpen} onOpenChange={setIsAddOpen} title="New Secure Note" description="Write a note that stays encrypted inside your vault." size="md" className="vault-create-sheet">
              <form onSubmit={handleAddItem} className="vault-create-form">
              <AdaptiveSheetBody className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[13px] text-muted-foreground ml-1 uppercase tracking-wider font-medium">Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Diary Entry, Server Keys"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-[17px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[13px] text-muted-foreground ml-1 uppercase tracking-wider font-medium">Content</label>
                  <textarea
                    placeholder="Write your secure note here..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-[17px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[150px] resize-y"
                    required
                  />
                </div>
              </AdaptiveSheetBody>
              <AdaptiveSheetFooter><Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button><Button type="submit" className="import-primary-action">Save Note</Button></AdaptiveSheetFooter>
              </form>
          </AdaptiveSheet>


        </div>
      </div>

      <div className="w-full">
        {loading ? (
          <CardListSkeleton count={4} />
        ) : items.length === 0 ? (
          <EmptyState type="notes" onCta={() => setIsAddOpen(true)} />
        ) : (
          <motion.div layout="position" className="flex flex-col gap-8 pb-12">
            <AnimatePresence mode="popLayout">
            {Object.entries(
              items.reduce((acc, item) => {
                const cat = item.category || "Uncategorized";
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
              }, {} as Record<string, DecryptedNote[]>)
            ).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryItems]) => (
              <motion.div layout="position" key={category} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                <div className="flex flex-col gap-1">
                  <AnimatePresence initial={false}>
                  {categoryItems
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map((item) => {
                  const isExpanded = expandedId === item.id;
                  const isSelected = selectedIds.has(item.id);

              return (
                <ContextActions key={item.id} title={item.title} actions={[
                  { id: "open", label: isExpanded ? "Close details" : "View details", onSelect: () => setExpandedId(isExpanded ? null : item.id) },
                  { id: "copy", label: "Copy note", onSelect: () => void copyToClipboard(item.plaintext) },
                  { id: "delete", label: "Delete", destructive: true, onSelect: () => { if (expandedId === item.id) setExpandedId(null); scheduleDelete(item); } },
                ]}>{(bindings) => <motion.div
                    {...bindings}
                    layout="position"
                    id={`item-${item.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    key={item.id} 
                    className={`relative overflow-hidden rounded-[10px] group transition-colors ${!isExpanded || expandedId !== item.id ? 'hover:bg-black/5 dark:hover:bg-white/5' : ''} ${isSelectionMode && isSelected ? 'ring-2 ring-primary/30 bg-primary/5' : 'bg-transparent'}`}
                  >
                    {isExpanded && !isSelectionMode && (
                      <motion.div
                        key="active-bg"
                        layoutId="note-active-bg"
                        className="absolute inset-0 bg-primary/10 rounded-[10px]"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                        style={{ zIndex: 0 }}
                      />
                    )}
                    <button
                      key="trigger-btn"
                      onClick={(e) => isSelectionMode ? toggleSelection(item.id, e) : setExpandedId(isExpanded ? null : item.id)}
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
                      <div className="w-10 h-10 bg-gradient-to-b from-orange-500 to-destructive rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                        <FileIcon strokeWidth={2.5} className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-[18px] font-semibold truncate tracking-tight ${isExpanded ? 'text-primary' : 'text-foreground'}`}>{item.title}</span>
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
                          <div className="flex flex-col gap-2 mb-6">
                            <div className="relative group/input">
                              <div className="w-full bg-muted rounded-xl px-4 py-3.5 text-[16px] text-foreground tracking-wide break-words whitespace-pre-wrap border border-transparent transition-colors font-mono">
                                {item.plaintext}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-row gap-3">
                            <button
                              className="flex-1 py-3 px-4 rounded-xl text-[15px] font-semibold text-primary-foreground bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm"
                              onClick={() => copyToClipboard(item.plaintext)}
                            >
                              Copy Note
                            </button>
                            <button 
                              onClick={(e) => handleDeleteItem(item.id, e)}
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
      {/* Floating Action Bar for Bulk Selection */}
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
            onClick={() => setSelectedIds(new Set(items.map(i => i.id)))}
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
