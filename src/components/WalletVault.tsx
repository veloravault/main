import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { encryptText, decryptText } from "@/lib/crypto";
import { setCache, invalidateCache } from "@/lib/vaultCache";
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
import { BuildingIcon, TrashIcon, CopyIcon, CameraIcon, Loader2Icon } from "lucide-react";

interface SecureWallet {
  id: string;
  title: string;
  type: string;
  encrypted_content: string;
  iv: string;
  salt: string;
}

interface DecryptedWallet {
  id: string;
  title: string;
  type: "credit_card" | "bank_account";
  payload: WalletPayload;
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

export function WalletVault({ masterPassword }: { masterPassword: string }) {
  const [items, setItems] = useState<DecryptedWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItemType, setNewItemType] = useState<"credit_card" | "bank_account">("credit_card");

  // Form State
  const [title, setTitle] = useState("");
  const [ccNumber, setCcNumber] = useState("");
  const [ccExpiry, setCcExpiry] = useState("");
  const [ccCvv, setCcCvv] = useState("");
  const [ccName, setCcName] = useState("");
  
  const [bankRouting, setBankRouting] = useState("");
  const [bankAccount, setBankAccount] = useState("");

  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typeText = async (text: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    setter("");
    for (let i = 0; i <= text.length; i++) {
      setter(text.slice(0, i));
      await new Promise(r => setTimeout(r, 30)); // 30ms per character typing speed
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
      
      if (newItemType === "credit_card") {
        if (data.data.number) void typeText(data.data.number, setCcNumber);
        if (data.data.expiry) void typeText(data.data.expiry, setCcExpiry);
        if (data.data.cvv) void typeText(data.data.cvv, setCcCvv);
        if (data.data.name) void typeText(data.data.name, setCcName);
      } else {
        if (data.data.routing) void typeText(data.data.routing, setBankRouting);
        if (data.data.account) void typeText(data.data.account, setBankAccount);
        if (data.data.name) void typeText(data.data.name, setCcName); 
      }
    } catch (err) {
      console.error(err);
      alert("Failed to scan image. Please try again.");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("secure_wallet")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code !== "42P01" && error.code !== "PGRST205" && error.code !== "PGRST116") { // Ignore missing table if they haven't run migration yet
        console.error("Error fetching wallet items:", JSON.stringify(error, null, 2));
      }
      setLoading(false);
      return;
    }

    const decryptedItems: DecryptedWallet[] = [];
    for (const item of (data as SecureWallet[])) {
      try {
        const jsonStr = await decryptText(item.encrypted_content, item.salt, item.iv, masterPassword);
        decryptedItems.push({
          id: item.id,
          title: item.title,
          type: item.type as "credit_card" | "bank_account",
          payload: JSON.parse(jsonStr) as WalletPayload,
        });
      } catch (err: unknown) {
        console.error(`Failed to decrypt wallet item ${item.title}`, err);
      }
    }
    setItems(decryptedItems);
    setCache("secure_wallet", decryptedItems);
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

    let payload: WalletPayload = {};
    if (newItemType === "credit_card") {
      payload = { number: ccNumber, expiry: ccExpiry, cvv: ccCvv, name: ccName };
    } else {
      payload = { routing: bankRouting, account: bankAccount, name: ccName };
    }

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
      setCcNumber(""); setCcExpiry(""); setCcCvv(""); setCcName("");
      setBankRouting(""); setBankAccount("");
      setIsAddOpen(false);
      invalidateCache("secure_wallet");
      fetchItems();
    } catch (err) {
      console.error("Failed to add wallet item:", err);
      alert("Failed to save the wallet item. Make sure you ran the SQL migration.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    const { error } = await supabase.from("secure_wallet").delete().eq("id", id);
    if (!error) {
      invalidateCache("secure_wallet");
      fetchItems();
    }
  };

  const getCardColor = (number: string) => {
    if (number.startsWith("4")) return "from-blue-600 to-blue-800 shadow-blue-900/40"; // Visa
    if (number.startsWith("5")) return "from-orange-500 to-red-600 shadow-red-900/40"; // Mastercard
    if (number.startsWith("3")) return "from-slate-700 to-slate-900 shadow-slate-900/40"; // Amex
    return "from-emerald-600 to-teal-800 shadow-teal-900/40";
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-full relative" style={{ perspective: "1500px" }}>
      <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8">
        <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight">Digital Wallet</h2>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger className="rounded-full h-9 px-3 sm:px-4 text-primary hover:bg-primary/10 hover:text-primary font-medium flex items-center gap-1.5 text-[14px] shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              Add Card
          </DialogTrigger>
          <DialogContent className="border-border/50 shadow-lg sm:rounded-[20px] max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center font-bold">New Wallet Item</DialogTitle>
            </DialogHeader>
            <div className="flex bg-secondary p-1 rounded-lg mt-2">
              <button 
                className={`flex-1 py-1.5 rounded-md text-[13px] font-semibold transition-all ${newItemType === 'credit_card' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setNewItemType("credit_card")}
              >
                Credit Card
              </button>
              <button 
                className={`flex-1 py-1.5 rounded-md text-[13px] font-semibold transition-all ${newItemType === 'bank_account' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setNewItemType("bank_account")}
              >
                Bank Account
              </button>
            </div>

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
                  placeholder={newItemType === 'credit_card' ? "e.g. Chase Sapphire" : "e.g. BoA Checking"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>

              {newItemType === "credit_card" ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[13px] text-muted-foreground ml-1 font-medium">Card Number</label>
                    <input
                      type="text"
                      placeholder="XXXX XXXX XXXX XXXX"
                      value={ccNumber}
                      onChange={(e) => setCcNumber(e.target.value)}
                      className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 font-mono text-[16px] tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      required
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="space-y-1 flex-1">
                      <label className="text-[13px] text-muted-foreground ml-1 font-medium">Expiry</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={ccExpiry}
                        onChange={(e) => setCcExpiry(e.target.value)}
                        className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 font-mono text-[16px] tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <label className="text-[13px] text-muted-foreground ml-1 font-medium">CVV</label>
                      <input
                        type="text"
                        placeholder="123"
                        value={ccCvv}
                        onChange={(e) => setCcCvv(e.target.value)}
                        className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 font-mono text-[16px] tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}

              <div className="space-y-1">
                <label className="text-[13px] text-muted-foreground ml-1 font-medium">Name on {newItemType === 'credit_card' ? 'Card' : 'Account'}</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={ccName}
                  onChange={(e) => setCcName(e.target.value)}
                  className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase"
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

      <div className="w-full">
        {loading ? (
          <WalletSkeleton />
        ) : items.length === 0 ? (
          <EmptyState type="wallet" onCta={() => setIsAddOpen(true)} />
        ) : (
          <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AnimatePresence>
            {items.map((item) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                key={item.id} 
              >
                {item.type === "credit_card" ? (
                  <TiltCard className="w-full group cursor-default">
                    <div className={`w-full aspect-[1.586/1] rounded-[24px] bg-gradient-to-br ${getCardColor(item.payload.number || "")} p-6 sm:p-8 flex flex-col justify-between text-white shadow-2xl relative overflow-hidden`}>
                      
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50" />
                      
                      <div className="flex justify-between items-start relative z-10">
                        <span className="text-[20px] font-semibold tracking-tight text-white/90">{item.title}</span>
                        <div className="w-12 h-8 bg-white/20 rounded-md backdrop-blur-sm" />
                      </div>
                      
                      <div className="relative z-10">
                        <div 
                          className="font-mono text-[22px] sm:text-[26px] tracking-[0.15em] sm:tracking-[0.2em] mb-4 text-white/95 cursor-pointer hover:text-white transition-colors"
                          onClick={() => copyToClipboard(item.payload.number || "")}
                          title="Click to copy"
                        >
                          {(item.payload.number || "").replace(/(\d{4})/g, '$1 ').trim()}
                        </div>
                        
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col uppercase tracking-wider">
                            <span className="text-[10px] text-white/60 mb-0.5">Cardholder Name</span>
                            <span className="font-semibold text-[15px] text-white/90">{item.payload.name || ""}</span>
                          </div>
                          <div className="flex gap-6">
                            <div className="flex flex-col uppercase tracking-wider">
                              <span className="text-[10px] text-white/60 mb-0.5">Valid Thru</span>
                              <span className="font-semibold font-mono text-[15px] text-white/90">{item.payload.expiry || ""}</span>
                            </div>
                            <div className="flex flex-col uppercase tracking-wider group/cvv relative cursor-pointer" onClick={() => copyToClipboard(item.payload.cvv || "")}>
                              <span className="text-[10px] text-white/60 mb-0.5">CVV</span>
                              <span className="font-semibold font-mono text-[15px] text-white/90 group-hover/cvv:opacity-0 transition-opacity">***</span>
                              <span className="font-semibold font-mono text-[15px] text-white/90 absolute bottom-0 right-0 opacity-0 group-hover/cvv:opacity-100 transition-opacity">{item.payload.cvv || ""}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Delete button that appears on hover */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500/80 hover:text-white z-20 backdrop-blur-md"
                        title="Delete Card"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </TiltCard>
                ) : (
                  <TiltCard className="w-full group cursor-default">
                    <div className="w-full h-full min-h-[220px] rounded-[24px] bg-card border border-border p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                          <BuildingIcon className="w-5 h-5 text-foreground" strokeWidth={2.5} />
                        </div>
                        <span className="text-[19px] font-semibold text-foreground tracking-tight">{item.title}</span>
                      </div>
                      
                      <div className="space-y-4 relative z-10 mt-6">
                        <div className="flex flex-col">
                          <span className="text-[12px] text-muted-foreground uppercase tracking-widest font-medium mb-1">Routing Number</span>
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
                      </div>

                      {/* Delete button that appears on hover */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground z-20"
                        title="Delete Bank Account"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </TiltCard>
                )}
              </motion.div>
            ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
