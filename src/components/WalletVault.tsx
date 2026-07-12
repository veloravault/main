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
import { VisaLogo, RuPayLogo } from "@/components/CardLogos";
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
  type: "credit_card";
  payload: WalletPayload;
}

type CreditCardPayload = {
  number?: string;
  expiry?: string;
  cvv?: string;
  name?: string;
  subtype?: "credit" | "debit";
  pin?: string;       // ATM / Debit card PIN
  upi_pin?: string;   // UPI PIN
  extra_details?: string; // any other info
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

export function WalletVault({ masterPassword, focusedItemId }: { masterPassword: string, focusedItemId?: string | null }) {
  const [items, setItems] = useState<DecryptedWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItemType, setNewItemType] = useState<"credit_card">("credit_card");

  // Form State
  const [title, setTitle] = useState("");
  const [ccNumber, setCcNumber] = useState("");
  const [ccExpiry, setCcExpiry] = useState("");
  const [ccCvv, setCcCvv] = useState("");
  const [ccName, setCcName] = useState("");
  const [ccPin, setCcPin] = useState("");
  const [ccUpiPin, setCcUpiPin] = useState("");
  const [cardSubtype, setCardSubtype] = useState<"credit" | "debit">("debit");

  // Expanded card detail panel state
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

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
    // Serve cache instantly — no skeleton flash on revisit
    const cached = getCache<DecryptedWallet>("secure_wallet_cards");
    if (cached) { setItems(cached); setLoading(false); return; }

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
      if (item.type === "bank_account") continue;
      try {
        const jsonStr = await decryptText(item.encrypted_content, item.salt, item.iv, masterPassword);
        decryptedItems.push({
          id: item.id,
          title: item.title,
          type: "credit_card",
          payload: JSON.parse(jsonStr) as WalletPayload,
        });
      } catch (err: unknown) {
        console.error(`Failed to decrypt wallet item ${item.title}`, err);
      }
    }
    setItems(decryptedItems);
    setCache("secure_wallet_cards", decryptedItems);
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

    const payload: WalletPayload = {
      number: ccNumber, expiry: ccExpiry, cvv: ccCvv, name: ccName,
      subtype: cardSubtype,
      pin: ccPin,
      upi_pin: ccUpiPin,
    };

    try {
      const encrypted = await encryptText(JSON.stringify(payload), masterPassword);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("No user found");

      const { error } = await supabase.from("secure_wallet").insert({
        user_id: user.id,
        title,
        type: "credit_card",
        encrypted_content: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
      });

      if (error) throw error;
      
      setTitle("");
      setCcNumber(""); setCcExpiry(""); setCcCvv(""); setCcName(""); setCcPin(""); setCcUpiPin(""); setCardSubtype("debit");
      setIsAddOpen(false);
      invalidateCache("secure_wallet_cards");
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
      invalidateCache("secure_wallet_cards");
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
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} cards?`)) return;
    
    const idsToDelete = Array.from(selectedIds);
    const { error } = await supabase.from("secure_wallet").delete().in("id", idsToDelete);
    if (!error) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      invalidateCache("secure_wallet_cards");
      fetchItems();
    } else {
      alert("Failed to delete items");
    }
  };

  const getCardColor = (number: string) => {
    const n = number.replace(/\s/g, '');
    if (n.startsWith("4")) return "from-[#1a1f71] to-[#2952c4] shadow-blue-900/50";
    const mc2 = parseInt(n.substring(0,2)), mc4 = parseInt(n.substring(0,4));
    if ((mc4 >= 2221 && mc4 <= 2720) || (mc2 >= 51 && mc2 <= 55))
      return "from-[#1a1a2e] to-[#16213e] shadow-slate-900/60"; // Mastercard — dark
    if (n.startsWith("34") || n.startsWith("37")) return "from-[#007b5e] to-[#004c3f] shadow-green-900/40";
    // RuPay — check 652x BEFORE generic 65 Discover
    if (n.startsWith("60") || n.startsWith("652") || n.startsWith("6069") || n.startsWith("6070"))
      return "from-[#00308F] to-[#001f5c] shadow-blue-900/50"; // RuPay — deep navy
    if (n.startsWith("6011") || n.startsWith("65") || (parseInt(n.substring(0,6)) >= 622126 && parseInt(n.substring(0,6)) <= 622925))
      return "from-[#e65c00] to-[#f9d423] shadow-orange-900/40";
    return "from-slate-700 to-slate-900 shadow-slate-900/40";
  };

  // Inline SVG logos — no external CDN dependency, always render correctly
  const getCardNetwork = (number: string): { name: string; logo: React.ReactNode } | null => {
    const n = number.replace(/\s/g, '');
    if (!n) return null;
    const mc2 = parseInt(n.substring(0,2)), mc4 = parseInt(n.substring(0,4));

    // ── Visa: classic bold italic wordmark ───────────────────────────────
    if (n.startsWith("4")) return {
      name: "Visa",
      logo: (
        <VisaLogo className="h-6 w-auto drop-shadow-md" />
      )
    };

    // ── Mastercard: two circles only, NO text ────────────────────────────
    if ((mc4 >= 2221 && mc4 <= 2720) || (mc2 >= 51 && mc2 <= 55)) return {
      name: "Mastercard",
      logo: (
        <svg viewBox="0 0 46 30" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto drop-shadow-md">
          <circle cx="16" cy="15" r="14" fill="#EB001B"/>
          <circle cx="30" cy="15" r="14" fill="#F79E1B"/>
          <path d="M23,3.2 a14,14,0,0,1,0,23.6 a14,14,0,0,1,0,-23.6z" fill="#FF5F00"/>
        </svg>
      )
    };

    // ── Amex ─────────────────────────────────────────────────────────────
    if (n.startsWith("34") || n.startsWith("37")) return {
      name: "Amex",
      logo: (
        <svg viewBox="0 0 84 24" xmlns="http://www.w3.org/2000/svg" className="h-6 w-auto">
          <text x="1" y="19" fontFamily="'Arial Black',Arial,sans-serif" fontSize="18" fontWeight="900" fill="white" letterSpacing="3">AMEX</text>
        </svg>
      )
    };

    // ── RuPay: tricolor bar + Ru (white) + Pay (orange) ──────────────────
    // 652x checked BEFORE generic 65 (Discover)
    if (n.startsWith("60") || n.startsWith("652") || n.startsWith("6069") || n.startsWith("6070")) return {
      name: "RuPay",
      logo: (
        <RuPayLogo className="h-6 w-auto drop-shadow-md" />
      )
    };

    // ── Discover ─────────────────────────────────────────────────────────
    if (n.startsWith("6011") || n.startsWith("65") || (parseInt(n.substring(0,6)) >= 622126 && parseInt(n.substring(0,6)) <= 622925)) return {
      name: "Discover",
      logo: (
        <svg viewBox="0 0 110 28" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
          <text x="0" y="22" fontFamily="Arial,sans-serif" fontSize="17" fontWeight="700" fill="white" letterSpacing="0.5">DISCOVER</text>
          <circle cx="101" cy="13" r="11" fill="#F76F20"/>
        </svg>
      )
    };

    // ── Maestro: red + blue circles ──────────────────────────────────────
    if (n.startsWith("50") || (mc2 >= 56 && mc2 <= 69)) return {
      name: "Maestro",
      logo: (
        <svg viewBox="0 0 46 30" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
          <circle cx="16" cy="15" r="14" fill="#EB001B" opacity="0.92"/>
          <circle cx="30" cy="15" r="14" fill="#0099DF" opacity="0.92"/>
          <path d="M23,3.2 a14,14,0,0,1,0,23.6 a14,14,0,0,1,0,-23.6z" fill="#7673C0"/>
        </svg>
      )
    };

    return null;
  };


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-full relative" style={{ perspective: "1500px" }}>
      <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8">
        <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight">Digital Wallet</h2>
        
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
                    {isSelectionMode ? "Cancel Editing" : "Select Cards"}
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
                Add Card
            </DialogTrigger>
          <DialogContent className="border-border/50 shadow-lg sm:rounded-[20px] max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center font-bold">New Card</DialogTitle>
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
              {/* Credit / Debit Toggle */}
              <div className="flex rounded-xl overflow-hidden border border-border p-1 bg-secondary gap-1">
                {(["debit", "credit"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCardSubtype(t)}
                    className={`flex-1 py-2 rounded-lg text-[14px] font-semibold capitalize transition-all ${
                      cardSubtype === t
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t} Card
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-[13px] text-muted-foreground ml-1 font-medium">Nickname / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Chase Sapphire"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>

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

              <div className="space-y-1">
                <label className="text-[13px] text-muted-foreground ml-1 font-medium">Name on Card</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={ccName}
                  onChange={(e) => setCcName(e.target.value)}
                  className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase"
                  required
                />
              </div>

              <div className="flex gap-4">
                <div className="space-y-1 flex-1">
                  <label className="text-[13px] text-muted-foreground ml-1 font-medium">Card PIN <span className="text-muted-foreground/50 font-normal">(optional)</span></label>
                  <input
                    type="password"
                    placeholder="••••"
                    value={ccPin}
                    onChange={(e) => setCcPin(e.target.value)}
                    className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 font-mono text-[16px] tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-1 flex-1">
                  <label className="text-[13px] text-muted-foreground ml-1 font-medium">UPI PIN <span className="text-muted-foreground/50 font-normal">(optional)</span></label>
                  <input
                    type="password"
                    placeholder="••••••"
                    value={ccUpiPin}
                    onChange={(e) => setCcUpiPin(e.target.value)}
                    className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 font-mono text-[16px] tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
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
          <EmptyState type="wallet" onCta={() => setIsAddOpen(true)} />
        ) : null}
      </div>
      {loading ? null : items.length > 0 ? (() => {
        // Detect subtype: use payload.subtype, else infer from title
        const inferSubtype = (item: DecryptedWallet): "credit" | "debit" | "other" => {
          if (item.payload.subtype) return item.payload.subtype;
          const t = item.title.toLowerCase();
          if (t.includes("credit")) return "credit";
          if (t.includes("debit")) return "debit";
          return "other";
        };

        const creditCards = items.filter(i => inferSubtype(i) === "credit");
        const debitCards  = items.filter(i => inferSubtype(i) === "debit");
        const otherCards  = items.filter(i => inferSubtype(i) === "other");

        const CardGrid = ({ cards }: { cards: DecryptedWallet[] }) => (
          <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatePresence>
            {cards.map((item) => (
              <motion.div
                layout
                id={`item-${item.id}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                key={item.id}
              >
                <TiltCard className="w-full group cursor-default">
                  <div
                    className={`w-full aspect-[1.586/1] rounded-[24px] bg-gradient-to-br ${getCardColor(item.payload.number || "")} p-6 sm:p-8 flex flex-col justify-between text-white shadow-2xl relative overflow-hidden ${isSelectionMode ? 'cursor-pointer' : ''}`}
                    onClick={(e) => { if (isSelectionMode) toggleSelection(item.id, e); }}
                  >
                    {isSelectionMode && (
                      <div className="absolute top-4 left-4 z-20 text-white">
                        {selectedIds.has(item.id)
                          ? <CheckSquareIcon strokeWidth={2.5} className="w-6 h-6 drop-shadow-md" />
                          : <SquareIcon strokeWidth={2} className="w-6 h-6 opacity-50 drop-shadow-md" />}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50" />
                    <div className="flex justify-between items-start relative z-10">
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-[20px] font-semibold tracking-tight text-white/90 ${isSelectionMode ? 'ml-8' : ''}`}>{item.title}</span>
                      </div>
                      <div className="flex items-center justify-end min-w-[60px] h-9">
                        {(() => {
                          const net = getCardNetwork(item.payload.number || "");
                          return net ? net.logo : <div className="w-12 h-8 bg-white/20 rounded-md backdrop-blur-sm" />;
                        })()}
                      </div>
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
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500/80 hover:text-white z-20 backdrop-blur-md"
                      title="Delete Card"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </TiltCard>

                {/* Expandable PIN / UPI / Extra Details Panel */}
                {(item.payload.pin || item.payload.upi_pin || item.payload.extra_details) && (
                  <div className="mt-2">
                    <button
                      onClick={() => setExpandedCardId(expandedCardId === item.id ? null : item.id)}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors text-[13px] font-medium text-muted-foreground"
                    >
                      <span>Card Details &amp; PINs</span>
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${expandedCardId === item.id ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <AnimatePresence>
                      {expandedCardId === item.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pt-3 pb-4 bg-secondary/40 rounded-xl mt-1 space-y-3">
                            {item.payload.pin && (
                              <div className="flex items-center justify-between">
                                <span className="text-[12px] uppercase tracking-widest text-muted-foreground font-medium">Card PIN</span>
                                <div
                                  className="group/pin flex items-center gap-2 cursor-pointer"
                                  onClick={() => copyToClipboard(item.payload.pin || "")}
                                  title="Click to copy"
                                >
                                  <span className="font-mono text-[15px] font-semibold text-foreground group-hover/pin:opacity-0 transition-opacity select-none">{"•".repeat(item.payload.pin.length)}</span>
                                  <span className="font-mono text-[15px] font-semibold text-foreground absolute opacity-0 group-hover/pin:opacity-100 transition-opacity">{item.payload.pin}</span>
                                  <svg className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/pin:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                                </div>
                              </div>
                            )}
                            {item.payload.upi_pin && (
                              <div className="flex items-center justify-between">
                                <span className="text-[12px] uppercase tracking-widest text-muted-foreground font-medium">UPI PIN</span>
                                <div
                                  className="group/upi flex items-center gap-2 cursor-pointer relative"
                                  onClick={() => copyToClipboard(item.payload.upi_pin || "")}
                                  title="Click to copy"
                                >
                                  <span className="font-mono text-[15px] font-semibold text-foreground group-hover/upi:opacity-0 transition-opacity select-none">{"•".repeat(item.payload.upi_pin.length)}</span>
                                  <span className="font-mono text-[15px] font-semibold text-foreground absolute right-6 opacity-0 group-hover/upi:opacity-100 transition-opacity">{item.payload.upi_pin}</span>
                                  <svg className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/upi:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                                </div>
                              </div>
                            )}
                            {item.payload.extra_details && (
                              <div>
                                <span className="text-[12px] uppercase tracking-widest text-muted-foreground font-medium block mb-1">Other Details</span>
                                <p className="text-[13px] text-foreground/80 whitespace-pre-wrap leading-relaxed">{item.payload.extra_details}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>

            ))}
            </AnimatePresence>
          </motion.div>
        );

        return (
          <div className="space-y-10">
            {creditCards.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Credit Cards</span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] text-muted-foreground">{creditCards.length}</span>
                </div>
                <CardGrid cards={creditCards} />
              </div>
            )}
            {debitCards.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Debit Cards</span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] text-muted-foreground">{debitCards.length}</span>
                </div>
                <CardGrid cards={debitCards} />
              </div>
            )}
            {otherCards.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Cards</span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] text-muted-foreground">{otherCards.length}</span>
                </div>
                <CardGrid cards={otherCards} />
              </div>
            )}
          </div>
        );
      })() : null}
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
