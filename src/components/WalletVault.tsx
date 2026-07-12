import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "@/components/ui/dialog";
import { TrashIcon, CameraIcon, Loader2Icon } from "lucide-react";
import { PaymentCard } from "@/components/PaymentCard";
import { WalletCardDetails } from "@/components/WalletCardDetails";
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

const inferSubtype = (item: DecryptedWallet): "credit" | "debit" | "other" => {
  if (item.payload.subtype) return item.payload.subtype;
  const title = item.title.toLowerCase();
  if (title.includes("credit")) return "credit";
  if (title.includes("debit")) return "debit";
  return "other";
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

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [walletFilter, setWalletFilter] = useState<WalletFilter>("all");

  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredCards = useMemo(() => items.filter((item) =>
    walletFilter === "all" || inferSubtype(item) === walletFilter
  ), [items, walletFilter]);
  const selectedCard = filteredCards.find((item) => item.id === selectedCardId)
    ?? filteredCards[0]
    ?? null;

  useEffect(() => {
    if (!filteredCards.length) setSelectedCardId(null);
    else if (!filteredCards.some((item) => item.id === selectedCardId)) {
      setSelectedCardId(filteredCards[0].id);
    }
  }, [filteredCards, selectedCardId]);

  useEffect(() => {
    if (focusedItemId) {
      setSelectedCardId(focusedItemId);
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
        console.warn("Error fetching wallet items:", JSON.stringify(error, null, 2));
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
        console.warn(`Failed to decrypt wallet item ${item.title}`, err);
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

  const activateCard = (id: string) => {
    setSelectedCardId(id);
    if (window.matchMedia("(max-width: 767px)").matches) {
      setMobileDetailsOpen(true);
    }
  };

  const selectedDetails = selectedCard ? {
    title: selectedCard.title,
    number: selectedCard.payload.number || "",
    name: selectedCard.payload.name,
    expiry: selectedCard.payload.expiry,
    cvv: selectedCard.payload.cvv,
    pin: selectedCard.payload.pin,
    upiPin: selectedCard.payload.upi_pin,
    extraDetails: selectedCard.payload.extra_details,
    onCopy: (value: string, _label: string) => copyToClipboard(value),
    onDelete: () => handleDelete(selectedCard.id),
  } : null;

  return (
    <div className="apple-surface w-full relative" style={{ perspective: "1500px" }}>
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
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

      {loading ? (
        <WalletSkeleton />
      ) : items.length === 0 ? (
        <EmptyState type="wallet" onCta={() => setIsAddOpen(true)} />
      ) : (
        <section className="wallet-page">
          <header className="wallet-page-header">
            <div>
              <p className="wallet-page-eyebrow">{items.length} saved cards</p>
              <h2 className="wallet-page-title">Digital Wallet</h2>
            </div>
            <div className="wallet-page-actions">
              <button
                type="button"
                onClick={() => {
                  setIsSelectionMode((value) => !value);
                  if (isSelectionMode) setSelectedIds(new Set());
                }}
              >
                {isSelectionMode ? "Cancel" : "Select"}
              </button>
              <button type="button" onClick={() => setIsAddOpen(true)}>Add card</button>
            </div>
          </header>

          <div className="wallet-segmented" role="tablist" aria-label="Card type">
            {(["all", "credit", "debit"] as WalletFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                role="tab"
                aria-selected={walletFilter === filter}
                onClick={() => setWalletFilter(filter)}
              >
                {filter === "all" ? "All" : filter === "credit" ? "Credit" : "Debit"}
              </button>
            ))}
          </div>

          {filteredCards.length ? (
            <div className="wallet-workspace">
              <motion.div layout className="wallet-deck">
                <AnimatePresence initial={false}>
                  {filteredCards.map((item, index) => {
                    const subtype = inferSubtype(item);
                    return (
                      <PaymentCard
                        key={item.id}
                        id={item.id}
                        title={item.title}
                        number={item.payload.number || ""}
                        name={item.payload.name}
                        expiry={item.payload.expiry}
                        subtype={subtype === "other" ? undefined : subtype}
                        colorClass={getCardColor(item.payload.number || "")}
                        selected={selectedCard?.id === item.id}
                        selectionMode={isSelectionMode}
                        checked={selectedIds.has(item.id)}
                        index={index}
                        onActivate={() => activateCard(item.id)}
                        onToggleChecked={(event) => toggleSelection(item.id, event)}
                        onCopyNumber={copyToClipboard}
                      />
                    );
                  })}
                </AnimatePresence>
              </motion.div>
              {selectedCard && (
                <aside className="wallet-inspector">
                  {selectedDetails && (
                    <WalletCardDetails key={`desktop-${selectedCard.id}`} {...selectedDetails} />
                  )}
                </aside>
              )}
            </div>
          ) : (
            <div className="wallet-filter-empty">
              <p>No cards in this category.</p>
              <button type="button" onClick={() => setWalletFilter("all")}>Show all cards</button>
            </div>
          )}
        </section>
      )}

      <Dialog open={mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
        <DialogContent className="wallet-mobile-sheet md:hidden">
          <DialogTitle className="sr-only">{selectedCard?.title ?? "Card details"}</DialogTitle>
          {selectedCard && selectedDetails && (
            <WalletCardDetails
              key={`mobile-${selectedCard.id}`}
              {...selectedDetails}
              onClose={() => setMobileDetailsOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
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
