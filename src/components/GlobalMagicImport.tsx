import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wand2Icon, Loader2Icon, XIcon, CheckIcon } from "lucide-react";
import { parseGlobalBulkData, GlobalImportResult } from "@/app/actions";
import { supabase } from "@/lib/supabase";
import { encryptText } from "@/lib/crypto";
import { invalidateCache } from "@/lib/vaultCache";

interface GlobalMagicImportProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  masterPassword: string | null;
  onSuccess: () => void;
}

type Phase = "idle" | "parsing" | "uploading" | "done";

export function GlobalMagicImport({ isOpen, onOpenChange, masterPassword, onSuccess }: GlobalMagicImportProps) {
  const [inputText, setInputText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [importStats, setImportStats] = useState<GlobalImportResult | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentLabel, setCurrentLabel] = useState("");

  const handleClose = () => {
    if (phase === "uploading" || phase === "parsing") return; // block only while actively working
    onOpenChange(false);
    setTimeout(() => {
      setImportStats(null);
      setInputText("");
      setPhase("idle");
      setUploadedCount(0);
      setTotalCount(0);
    }, 300);
  };

  const handleProcess = async () => {
    if (!inputText.trim() || !masterPassword) return;
    setPhase("parsing");
    setImportStats(null);
    setUploadedCount(0);
    setTotalCount(0);

    try {
      const parsedData = await parseGlobalBulkData(inputText);
      setImportStats(parsedData);

      const total =
        parsedData.passwords.length +
        parsedData.notes.length +
        parsedData.bank_accounts.length +
        parsedData.credit_cards.length;

      setTotalCount(total);
      setUploadedCount(0);
      setPhase("uploading");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      let done = 0;

      const tick = (label: string) => {
        done++;
        setUploadedCount(done);
        setCurrentLabel(label);
      };

      // Handle Passwords
      if (parsedData.passwords.length > 0) {
        const { data: existingPass } = await supabase.from("vault_items").select("id, title, category");
        for (const item of parsedData.passwords) {
          const payload = {
            domain: item.url || null,
            username: item.username || "",
            password: item.password || "",
            notes: item.extra_details || ""
          };
          const encrypted = await encryptText(JSON.stringify(payload), masterPassword);
          const sameAccount = existingPass?.find(e =>
            e.title.toLowerCase() === (item.title || "Untitled").toLowerCase()
          );
          if (sameAccount) {
            await supabase.from("vault_items").update({
              encrypted_data: encrypted.ciphertext,
              iv: encrypted.iv,
              salt: encrypted.salt,
              domain: item.url || null,
              category: item.category || sameAccount.category || "Uncategorized"
            }).eq("id", sameAccount.id);
          } else {
            await supabase.from("vault_items").insert({
              user_id: user.id,
              title: item.title || "Untitled",
              category: item.category || "Uncategorized",
              domain: item.url || null,
              encrypted_data: encrypted.ciphertext,
              iv: encrypted.iv,
              salt: encrypted.salt,
            });
          }
          tick(item.title || "Password");
        }
      }

      // Handle Notes
      if (parsedData.notes.length > 0) {
        const { data: existingNotes } = await supabase.from("secure_notes").select("id, title, category");
        for (const item of parsedData.notes) {
          const encrypted = await encryptText(item.content || "", masterPassword);
          const existing = existingNotes?.find(e =>
            e.title.toLowerCase() === (item.title || "Untitled Note").toLowerCase()
          );
          if (existing) {
            await supabase.from("secure_notes").update({
              encrypted_content: encrypted.ciphertext,
              iv: encrypted.iv,
              salt: encrypted.salt,
              category: item.category || existing.category || "Uncategorized"
            }).eq("id", existing.id);
          } else {
            await supabase.from("secure_notes").insert({
              user_id: user.id,
              title: item.title || "Untitled Note",
              category: item.category || "Uncategorized",
              encrypted_content: encrypted.ciphertext,
              iv: encrypted.iv,
              salt: encrypted.salt,
            });
          }
          tick(item.title || "Note");
        }
      }

      // Handle Bank Accounts
      if (parsedData.bank_accounts.length > 0) {
        const { data: existingBank } = await supabase.from("secure_wallet").select("id, title").eq("type", "bank_account");
        for (const item of parsedData.bank_accounts) {
          const payload = {
            routing: item.routing || "",
            account: item.account || "",
            name: item.name || "",
            extra_details: item.extra_details || "",
          };
          const encrypted = await encryptText(JSON.stringify(payload), masterPassword);
          const title = item.title || "Bank Account";
          const existing = existingBank?.find(e => e.title.toLowerCase() === title.toLowerCase());
          if (existing) {
            await supabase.from("secure_wallet").update({
              encrypted_content: encrypted.ciphertext,
              iv: encrypted.iv,
              salt: encrypted.salt,
            }).eq("id", existing.id);
          } else {
            await supabase.from("secure_wallet").insert({
              user_id: user.id,
              title: title,
              type: "bank_account",
              encrypted_content: encrypted.ciphertext,
              iv: encrypted.iv,
              salt: encrypted.salt,
            });
          }
          tick(title);
        }
      }

      // Handle Credit Cards
      if (parsedData.credit_cards.length > 0) {
        const { data: existingCards } = await supabase.from("secure_wallet").select("id, title").eq("type", "credit_card");
        for (const item of parsedData.credit_cards) {
          const payload = {
            number: item.number || "",
            expiry: item.expiry || "",
            cvv: item.cvv || "",
            name: item.name || "",
            pin: item.pin || "",
            upi_pin: item.upi_pin || "",
            subtype: (item.title || "").toLowerCase().includes("debit") ? "debit" : "credit",
            extra_details: item.extra_details || "",
          };
          const encrypted = await encryptText(JSON.stringify(payload), masterPassword);
          const title = item.title || "Credit Card";
          const existing = existingCards?.find(e => e.title.toLowerCase() === title.toLowerCase());
          if (existing) {
            await supabase.from("secure_wallet").update({
              encrypted_content: encrypted.ciphertext,
              iv: encrypted.iv,
              salt: encrypted.salt,
            }).eq("id", existing.id);
          } else {
            await supabase.from("secure_wallet").insert({
              user_id: user.id,
              title: title,
              type: "credit_card",
              encrypted_content: encrypted.ciphertext,
              iv: encrypted.iv,
              salt: encrypted.salt,
            });
          }
          tick(title);
        }
      }

      // Invalidate all caches
      invalidateCache("vault_items");
      invalidateCache("vault_items_titles");
      invalidateCache("secure_notes");
      invalidateCache("secure_wallet_cards");
      invalidateCache("secure_wallet_banks");

      setPhase("done");
      setInputText("");
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2200);

    } catch (err) {
      console.error(err);
      alert("Failed to parse and import data.");
      setPhase("idle");
    }
  };

  const totalImported = importStats
    ? importStats.passwords.length + importStats.notes.length + importStats.bank_accounts.length + importStats.credit_cards.length
    : 0;

  const progressPercent = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 0;
  const isWorking = phase === "parsing" || phase === "uploading";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-border/50 shadow-2xl rounded-[32px] bg-background/90 backdrop-blur-3xl [&>button]:hidden">
        {/* Custom close button — always visible unless actively uploading */}
        <button
          onClick={handleClose}
          disabled={isWorking}
          className="absolute top-5 right-5 z-50 w-8 h-8 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Close"
        >
          <XIcon className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <div className="relative z-10 p-8">
          <DialogHeader className="mb-8 space-y-3 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#007aff]/10 dark:bg-[#0a84ff]/20 flex items-center justify-center mb-2">
              {phase === "done" ? (
                <CheckIcon className="w-8 h-8 text-green-500" strokeWidth={2.5} />
              ) : (
                <Wand2Icon className={`w-8 h-8 text-[#007aff] dark:text-[#0a84ff] ${isWorking ? "animate-pulse" : ""}`} strokeWidth={1.5} />
              )}
            </div>
            <DialogTitle className="text-[24px] font-semibold tracking-tight text-foreground">
              {phase === "done" ? "Import Complete" : "Magic Import"}
            </DialogTitle>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-[360px] mx-auto">
              {phase === "idle" && "Paste your unstructured data. Our AI will securely organize and encrypt it into your vault."}
              {phase === "parsing" && "AI is reading and categorizing your data…"}
              {phase === "uploading" && `Encrypting and saving to your vault…`}
              {phase === "done" && `All ${totalImported} items have been securely saved.`}
            </p>
          </DialogHeader>

          <AnimatePresence mode="wait">

            {/* Uploading progress view */}
            {(phase === "uploading" || phase === "done") && importStats && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              >
                {/* Progress bar */}
                {phase === "uploading" && (
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-medium text-muted-foreground truncate max-w-[60%]">
                        {currentLabel && `Saving "${currentLabel}"…`}
                      </span>
                      <span className="text-[13px] font-semibold text-foreground tabular-nums">
                        {uploadedCount} / {totalCount}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-[#007aff] dark:bg-[#0a84ff] rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}

                {/* Stats grid */}
                <div className="bg-[#f2f2f7] dark:bg-[#1c1c1e] rounded-[20px] p-5">
                  <h3 className="font-medium text-[13px] text-[#8e8e93] dark:text-[#98989d] mb-4 text-center tracking-tight">
                    {phase === "done" ? `✓ Successfully saved ${totalImported} items` : `Processing ${totalImported} items`}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Passwords", count: importStats.passwords.length },
                      { label: "Bank Accounts", count: importStats.bank_accounts.length },
                      { label: "Credit Cards", count: importStats.credit_cards.length },
                      { label: "Notes", count: importStats.notes.length },
                    ].map(({ label, count }) => (
                      <div key={label} className="flex flex-col items-center justify-center p-4 bg-white dark:bg-[#2c2c2e] rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-black/[0.04] dark:border-white/[0.04]">
                        <span className="text-[10px] uppercase tracking-[0.12em] text-[#8e8e93] font-semibold mb-1">{label}</span>
                        <span className="text-[32px] font-light text-foreground tracking-tighter">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Parsing spinner */}
            {phase === "parsing" && (
              <motion.div
                key="parsing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-10 gap-4"
              >
                <Loader2Icon className="w-10 h-10 text-[#007aff] animate-spin" strokeWidth={1.5} />
                <p className="text-[14px] text-muted-foreground">AI is analyzing your data…</p>
              </motion.div>
            )}

            {/* Input view */}
            {phase === "idle" && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              >
                <textarea
                  placeholder={`e.g.\nInstagram:\ntejastelkar9 = Shelar9*\n\nHDFC Bank\nCustomer ID = 12345\nPassword = mypass`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full h-48 sm:h-56 p-5 rounded-[20px] bg-secondary/30 border border-border/50 resize-none text-[15px] leading-relaxed focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all placeholder:text-muted-foreground/60"
                />
                <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={handleClose}
                    className="font-medium h-12 px-6 rounded-xl hover:bg-secondary/80 text-[15px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleProcess}
                    disabled={!inputText.trim()}
                    className="font-medium h-12 px-7 rounded-xl bg-[#007aff] hover:bg-[#006ee6] text-white shadow-sm transition-all active:scale-[0.98] text-[15px]"
                  >
                    Import Data
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
