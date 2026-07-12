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
import { BuildingIcon, TrashIcon, CopyIcon, CameraIcon, Loader2Icon, MoreHorizontalIcon, CheckSquareIcon, SquareIcon, XIcon } from "lucide-react";
import { CardNetworkLogo, getCardNetwork } from "@/components/CardLogos";
import { PaymentCard } from "@/components/PaymentCard";
import { SelectionToolbar } from "@/components/SelectionToolbar";
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
type WalletFilter = "all" | "credit" | "debit";

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
  const [walletFilter, setWalletFilter] = useState<WalletFilter>("all");

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

  const toggleSelection = (id: string, e: React.SyntheticEvent) => {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="apple-surface w-full relative" style={{ perspective: "1500px" }}>
      <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8">
        <h2 className="hidden md:block type-section-title">Digital Wallet</h2>
        
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
          <DialogContent className="apple-bottom-sheet border-border/50 shadow-lg sm:rounded-[20px] max-w-md">
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

        const filteredCards = items.filter(item => walletFilter === "all" || inferSubtype(item) === walletFilter);

        const CardGrid = ({ cards }: { cards: DecryptedWallet[] }) => (
          <motion.div layout className="apple-wallet-stack grid grid-cols-1 gap-0">
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
                <PaymentCard
                  id={item.id}
                  title={item.title}
                  number={item.payload.number || ""}
                  name={item.payload.name}
                  expiry={item.payload.expiry}
                  cvv={item.payload.cvv}
                  subtype={item.payload.subtype}
                  colorClass={getCardColor(item.payload.number || "")}
                  selected={selectedIds.has(item.id)}
                  selectionMode={isSelectionMode}
                  expanded={expandedCardId === item.id}
                  stackIndex={cards.indexOf(item)}
                  stacked={cards.length > 1}
                  active={expandedCardId === item.id || (!expandedCardId && cards.indexOf(item) === cards.length - 1)}
                  hasDetails={Boolean(item.payload.pin || item.payload.upi_pin || item.payload.extra_details)}
                  onSelect={(event) => toggleSelection(item.id, event)}
                  onToggle={() => setExpandedCardId(expandedCardId === item.id ? null : item.id)}
                  onDelete={() => handleDelete(item.id)}
                  onCopy={copyToClipboard}
                />
                {false && (
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
                      <div className="flex items-center justify-end min-w-[60px] h-9 mr-8">
                        {(() => {
                          const network = getCardNetwork(item.payload.number || "");
                          return <CardNetworkLogo network={network} />;
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
                )}

              </motion.div>

            ))}
            </AnimatePresence>
          </motion.div>
        );

        const activeCard = filteredCards.find(item => item.id === expandedCardId) ?? filteredCards.at(-1);

        return (
          <div className="space-y-5">
            <div className="mx-auto flex w-full max-w-sm rounded-xl bg-secondary/70 p-1" role="tablist" aria-label="Card type">
              {(["all", "credit", "debit"] as WalletFilter[]).map(filter => <button key={filter} onClick={() => setWalletFilter(filter)} className={`apple-pressed min-h-9 flex-1 rounded-[10px] text-[13px] font-semibold capitalize ${walletFilter === filter ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>{filter === "all" ? "All" : filter === "credit" ? "Credit" : "Debit"}</button>)}
            </div>
            {activeCard ? (
              <div className="apple-wallet-master-detail">
                <CardGrid cards={filteredCards} />
                {expandedCardId && <button type="button" className="apple-wallet-detail-backdrop md:hidden" aria-label="Close card details" onClick={() => setExpandedCardId(null)} />}
                <aside className={`apple-wallet-detail-pane apple-group ${expandedCardId ? "block" : "hidden md:block"}`} aria-label={`${activeCard.title} details`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="type-group-label">Selected card</p>
                      <h3 className="mt-1 truncate text-[21px] font-semibold tracking-[-0.025em]">{activeCard.title}</h3>
                    </div>
                    <div className="flex h-9 min-w-20 justify-end">
                      <CardNetworkLogo network={getCardNetwork(activeCard.payload.number || "")} />
                    </div>
                    <button type="button" className="apple-wallet-detail-close md:hidden" aria-label="Close card details" onClick={() => setExpandedCardId(null)}><XIcon className="h-4 w-4" /></button>
                  </div>

                  <dl className="mt-5 divide-y divide-border/70">
                    <div className="py-3">
                      <dt className="type-metadata">Card number</dt>
                      <dd className="mt-1 flex items-center justify-between gap-3">
                        <span className="truncate font-mono text-[15px] tabular-nums">{(activeCard.payload.number || "").replace(/(\d{4})/g, "$1 ").trim()}</span>
                        <button type="button" className="apple-pressed min-h-9 rounded-full bg-secondary px-3 text-[13px] font-semibold text-primary" onClick={() => copyToClipboard(activeCard.payload.number || "")}>Copy</button>
                      </dd>
                    </div>
                    <div className="grid grid-cols-2 gap-4 py-3">
                      <div><dt className="type-metadata">Cardholder</dt><dd className="mt-1 truncate text-[15px] font-medium">{activeCard.payload.name || "Card holder"}</dd></div>
                      <div><dt className="type-metadata">Expires</dt><dd className="mt-1 font-mono text-[15px] tabular-nums">{activeCard.payload.expiry || "••/••"}</dd></div>
                    </div>
                  </dl>

                  {expandedCardId === activeCard.id && (activeCard.payload.pin || activeCard.payload.upi_pin || activeCard.payload.extra_details) && (
                    <div className="mt-3 rounded-2xl bg-secondary/60 p-4" aria-live="polite">
                      <p className="type-group-label mb-3">Secure details</p>
                      <div className="space-y-3 text-[14px]">
                        {activeCard.payload.pin && <button type="button" className="flex min-h-9 w-full items-center justify-between" onClick={() => copyToClipboard(activeCard.payload.pin || "")}><span>Card PIN</span><span className="font-mono">•••• · Copy</span></button>}
                        {activeCard.payload.upi_pin && <button type="button" className="flex min-h-9 w-full items-center justify-between" onClick={() => copyToClipboard(activeCard.payload.upi_pin || "")}><span>UPI PIN</span><span className="font-mono">•••• · Copy</span></button>}
                        {activeCard.payload.extra_details && <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{activeCard.payload.extra_details}</p>}
                      </div>
                    </div>
                  )}

                  <button type="button" onClick={() => handleDelete(activeCard.id)} className="apple-pressed mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 text-[14px] font-semibold text-destructive">
                    <TrashIcon className="h-4 w-4" /> Delete Card
                  </button>
                </aside>
              </div>
            ) : (
              <div className="py-12 text-center text-[14px] text-muted-foreground">No cards match this filter.</div>
            )}
          </div>
        );
      })() : null}
      {/* Floating Action Bar for Bulk Selection */}
      {isSelectionMode && selectedIds.size > 0 && (
        <>
        <SelectionToolbar count={selectedIds.size} onCancel={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} onDelete={handleBulkDelete} />
        <div className="hidden md:flex fixed bottom-8 left-1/2 -translate-x-1/2 bg-popover/80 backdrop-blur-xl border border-border shadow-2xl rounded-2xl px-6 py-4 items-center gap-6 animate-in slide-in-from-bottom-8 duration-300 z-50">
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
