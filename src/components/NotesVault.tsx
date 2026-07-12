import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { encryptText, decryptText } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { CardListSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronDownIcon, ChevronRightIcon, FileIcon, Wand2Icon, MoreHorizontalIcon, PlusIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { categorizeNote, parseBulkNotes } from "@/app/actions";
import { setCache, invalidateCache } from "@/lib/vaultCache";

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

export function NotesVault({ masterPassword }: { masterPassword: string }) {
  const [items, setItems] = useState<DecryptedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // New Item State
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  // Magic Import State
  const [isMagicImportOpen, setIsMagicImportOpen] = useState(false);
  const [magicNotesText, setMagicNotesText] = useState("");
  const [isMagicImporting, setIsMagicImporting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("secure_notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching secure notes:", error);
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
        console.error(`Failed to decrypt note ${item.title}`, err);
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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;

    try {
      const encrypted = await encryptText(newContent, masterPassword);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("No user found");

      const category = await categorizeNote(newTitle);

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
      alert("Failed to encrypt and save the note.");
    }
  };

  const handleMagicImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicNotesText) return;
    setIsMagicImporting(true);
    
    try {
      const parsedNotes = await parseBulkNotes(magicNotesText);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      if (!parsedNotes || parsedNotes.length === 0) {
        alert("Could not find any notes in the text.");
        setIsMagicImporting(false);
        return;
      }

      let importedCount = 0;
      for (const item of parsedNotes) {
        if (!item.content) continue;
        
        const title = item.title || "Unknown Note";
        const contentText = item.content;
        
        const encrypted = await encryptText(contentText, masterPassword);

        const { error } = await supabase.from("secure_notes").insert({
          user_id: user.id,
          title: title,
          encrypted_content: encrypted.ciphertext,
          iv: encrypted.iv,
          salt: encrypted.salt,
          category: item.category || "Uncategorized",
        });
        if (!error) importedCount++;
      }

      alert(`Magic imported ${importedCount} notes!`);
      setMagicNotesText("");
      setIsMagicImportOpen(false);
      invalidateCache("secure_notes");
      fetchItems();

    } catch (err) {
      console.error("Magic import failed", err);
      alert("Failed to parse notes.");
    } finally {
      setIsMagicImporting(false);
    }
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this note?")) return;
    const { error } = await supabase.from("secure_notes").delete().eq("id", id);
    if (!error) {
      if (expandedId === id) setExpandedId(null);
      invalidateCache("secure_notes");
      fetchItems();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8">
        <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight">Secure Notes</h2>
        
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full w-9 h-9 p-0 text-muted-foreground hover:bg-muted/80 flex items-center justify-center">
              <MoreHorizontalIcon className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem 
                onClick={() => setIsMagicImportOpen(true)}
                className="font-medium text-purple-600 focus:text-purple-600 focus:bg-purple-600/10 cursor-pointer"
              >
                <Wand2Icon className="w-4 h-4 mr-2" />
                Magic Import
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger className="rounded-full h-9 px-4 sm:px-5 font-semibold text-[14px] flex items-center gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 outline-none">
              <PlusIcon className="w-4 h-4" />
              <span className="hidden min-[380px]:inline">New</span>
            </DialogTrigger>
            <DialogContent className="border-border/50 shadow-lg sm:rounded-[20px] max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-center font-bold">New Secure Note</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddItem} className="space-y-4 mt-2">
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
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl font-semibold text-[17px] mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Save Note
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isMagicImportOpen} onOpenChange={setIsMagicImportOpen}>
            <DialogContent className="border-border/50 shadow-lg sm:rounded-[20px] max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-center font-bold flex items-center justify-center gap-2">
                  <Wand2Icon className="w-5 h-5 text-purple-600" />
                  Magic Import Notes
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleMagicImport} className="space-y-4 mt-2">
                <div className="space-y-1">
                  <p className="text-[14px] text-muted-foreground text-center mb-4">
                    Paste your huge unstructured notes dump (from Apple Notes, Keep, etc.). Our AI will securely split them into separate, categorized notes!
                  </p>
                  <textarea
                    placeholder="Note 1: My ideas...&#10;&#10;Note 2: Things to buy...&#10;..."
                    value={magicNotesText}
                    onChange={(e) => setMagicNotesText(e.target.value)}
                    className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all min-h-[200px] resize-y"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isMagicImporting || !magicNotesText}
                  className="w-full h-12 rounded-xl font-semibold text-[17px] mt-4 bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 justify-center"
                >
                  {isMagicImporting ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                        <Wand2Icon className="w-5 h-5" />
                      </motion.div>
                      Analyzing Notes...
                    </>
                  ) : (
                    <>
                      <Wand2Icon className="w-5 h-5" />
                      Extract & Import
                    </>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="w-full">
        {loading ? (
          <CardListSkeleton count={4} />
        ) : items.length === 0 ? (
          <EmptyState type="notes" onCta={() => setIsAddOpen(true)} />
        ) : (
          <motion.div layout className="flex flex-col gap-8 pb-12">
            <AnimatePresence mode="popLayout">
            {Object.entries(
              items.reduce((acc, item) => {
                const cat = item.category || "Uncategorized";
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
              }, {} as Record<string, DecryptedNote[]>)
            ).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryItems]) => (
              <motion.div layout key={category} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-2 px-1">
                  {category}
                </p>
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <AnimatePresence initial={false}>
                  {categoryItems
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map((item, i, arr) => {
                  const isExpanded = expandedId === item.id;
                  const isLast = i === arr.length - 1;

              return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    key={item.id} 
                    className={`bg-card transition-all duration-300 overflow-hidden ${!isLast ? 'border-b border-border' : ''}`}
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="flex items-center justify-between p-4 sm:p-5 w-full focus:outline-none cursor-default group"
                    >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-b from-orange-500 to-destructive rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                        <FileIcon strokeWidth={2.5} className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[18px] text-foreground font-semibold truncate tracking-tight">{item.title}</span>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-muted' : 'group-hover:bg-muted'}`}>
                      {isExpanded ? <ChevronDownIcon strokeWidth={2.5} className="w-5 h-5 text-foreground" /> : <ChevronRightIcon strokeWidth={2.5} className="w-5 h-5 text-muted-foreground" />}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5">
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
    </div>
  );
}
