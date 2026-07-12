import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { encryptText, decryptText } from "@/lib/crypto";
import { setCache, getCache, invalidateCache } from "@/lib/vaultCache";
import { WalletSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BuildingIcon, TrashIcon, CopyIcon, CameraIcon, Loader2Icon, MoreHorizontalIcon, CheckSquareIcon, SquareIcon } from "lucide-react";

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

type CreditCardPayload = {
  number?: string;
  expiry?: string;
  cvv?: string;
  name?: string;
};

type BankAccountPayload = {
  routing?: string;
  account?: string;
  name?: string;
  extra_details?: string;
};

type WalletPayload = CreditCardPayload & BankAccountPayload;

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

const TiltCard = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / rect.width - 0.5;
    const yPct = mouseY / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`relative rounded-[24px] ${className} transition-shadow duration-300`}
    >
      <div 
        style={{ transform: "translateZ(20px)" }} 
        className="w-full h-full relative"
      >
        {children}
      </div>
    </motion.div>
  );
};

export function BankVault({ masterPassword, focusedItemId }: { masterPassword: string, focusedItemId?: string | null }) {
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

  useEffect(() => {
    if (focusedItemId) {
      setTimeout(() => {
        const el = document.getElementById(`item-${focusedItemId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [focusedItemId]);

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
      const res = await fetch("/api/scan", {
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
      alert("Failed to scan image. Please try again.");
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
        console.error("Error fetching wallet items:", JSON.stringify(error, null, 2));
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
        console.error(`Failed to decrypt wallet item ${item.title}`, err);
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

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this item?")) return;
    const { error } = await supabase.from("secure_wallet").delete().eq("id", id);
    if (!error) {
      invalidateCache("secure_wallet_banks");
      fetchItems();
    }
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="apple-surface w-full relative" style={{ perspective: "1500px" }}>
      <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8">
        <h2 className="hidden md:block type-section-title">Bank Accounts</h2>
        
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full w-9 h-9 p-0 text-muted-foreground hover:bg-muted/80 flex items-center justify-center">
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

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger className="rounded-full h-9 px-3 sm:px-4 text-primary hover:bg-primary/10 hover:text-primary font-medium flex items-center gap-1.5 text-[14px] shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                Add Account
            </DialogTrigger>
          <DialogContent className="apple-bottom-sheet border-border/50 shadow-lg sm:rounded-[20px] max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center font-bold">New Bank Account</DialogTitle>
            </DialogHeader>

            <div className="mt-4 flex flex-col gap-2">
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

            <form onSubmit={handleAddItem} className="space-y-4 mt-2">
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

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl font-semibold text-[17px] mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Encrypt & Save
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="w-full">
        {loading ? (
          <WalletSkeleton />
        ) : items.length === 0 ? (
          <EmptyState type="bank" onCta={() => setIsAddOpen(true)} />
        ) : (
          <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AnimatePresence>
            {items.map((item) => (
              <motion.div 
                layout
                id={`item-${item.id}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                key={item.id} 
              >
                  <div 
                    className={`w-full bg-card border ${isSelectionMode && selectedIds.has(item.id) ? 'border-primary ring-1 ring-primary' : 'border-border'} rounded-[24px] p-6 sm:p-8 flex flex-col justify-between shadow-sm relative overflow-hidden group ${isSelectionMode ? 'cursor-pointer' : ''}`}
                    onClick={(e) => {
                      if (isSelectionMode) toggleSelection(item.id, e);
                    }}
                  >
                    {isSelectionMode && (
                      <div className="absolute top-4 left-4 z-20">
                        {selectedIds.has(item.id)
                          ? <CheckSquareIcon strokeWidth={2.5} className="w-5 h-5 text-primary" />
                          : <SquareIcon strokeWidth={2} className="w-5 h-5 text-muted-foreground opacity-50" />}
                      </div>
                    )}

                    <div className={`flex justify-between items-start mb-6 ${isSelectionMode ? 'ml-8' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <BuildingIcon strokeWidth={2} className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-[18px] font-semibold tracking-tight text-foreground">{item.title}</span>
                      </div>
                    </div>

                    <div className="space-y-4 relative z-10 mt-6">
                      <div className="flex flex-col">
                        <span className="text-[12px] text-muted-foreground uppercase tracking-widest font-medium mb-1">IFSC / Routing Code</span>
                        <div 
                          className="font-mono text-[16px] text-foreground font-semibold cursor-pointer flex items-center gap-2 group/copy hover:text-primary transition-colors"
                          onClick={() => copyToClipboard(item.payload.routing || "")}
                        >
                          {item.payload.routing || ""}
                          <CopyIcon className="w-3 h-3 opacity-0 group-hover/copy:opacity-100" />
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] text-muted-foreground uppercase tracking-widest font-medium mb-1">Account Number</span>
                        <div 
                          className="font-mono text-[16px] text-foreground font-semibold cursor-pointer flex items-center gap-2 group/copy hover:text-primary transition-colors"
                          onClick={() => copyToClipboard(item.payload.account || "")}
                        >
                          {item.payload.account || ""}
                          <CopyIcon className="w-3 h-3 opacity-0 group-hover/copy:opacity-100" />
                        </div>
                      </div>
                      {item.payload.extra_details && (
                        <div className="pt-2 border-t border-border/50">
                          <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium block mb-2">Additional Info</span>
                          {item.payload.extra_details.split("\n").filter(Boolean).map((line, i) => {
                            const [label, ...rest] = line.split(":");
                            const value = rest.join(":").trim();
                            return value ? (
                              <div key={i} className="flex items-center justify-between py-1">
                                <span className="text-[12px] text-muted-foreground">{label.trim()}</span>
                                <div
                                  className="group/extra flex items-center gap-2 cursor-pointer relative"
                                  onClick={() => copyToClipboard(value)}
                                  title="Click to copy"
                                >
                                  <span className="font-mono text-[13px] font-semibold text-foreground group-hover/extra:opacity-0 transition-opacity select-none">{"•".repeat(Math.min(value.length, 8))}</span>
                                  <span className="font-mono text-[13px] font-semibold text-foreground absolute right-5 opacity-0 group-hover/extra:opacity-100 transition-opacity">{value}</span>
                                  <CopyIcon className="w-3 h-3 text-muted-foreground opacity-0 group-hover/extra:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ) : (
                              <p key={i} className="text-[12px] text-foreground/70">{line}</p>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Delete button that appears on hover */}
                    <button 
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground z-20"
                      title="Delete Bank Account"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
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
