"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { SearchIcon, KeyRoundIcon, FileTextIcon, FileIcon, CreditCardIcon, BuildingIcon, XIcon } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  vault: "passwords" | "documents" | "notes" | "wallet" | "banks";
}

const VAULT_META = {
  passwords:  { icon: KeyRoundIcon,     label: "Password",   color: "text-blue-500",   bg: "bg-blue-500/10" },
  documents:  { icon: FileTextIcon,     label: "Document",   color: "text-purple-500", bg: "bg-purple-500/10" },
  notes:      { icon: FileIcon,         label: "Note",       color: "text-amber-500",  bg: "bg-amber-500/10" },
  wallet:     { icon: CreditCardIcon,   label: "Wallet",     color: "text-emerald-500",bg: "bg-emerald-500/10" },
  banks:      { icon: BuildingIcon,     label: "Bank",       color: "text-indigo-500", bg: "bg-indigo-500/10" },
};

interface GlobalSearchProps {
  onNavigate: (tab: SearchResult["vault"], id?: string) => void;
  autoFocus?: boolean;
}

export function GlobalSearch({ onNavigate, autoFocus }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus when used as command palette
  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 50);
      queueMicrotask(() => setOpen(true));
    }
  }, [autoFocus]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);

    const pattern = `%${q}%`;
    const [passRes, docRes, noteRes, walletRes] = await Promise.all([
      supabase.from("vault_items").select("id, title, category").ilike("title", pattern).limit(5),
      supabase.from("vault_documents").select("id, title").ilike("title", pattern).limit(5),
      supabase.from("secure_notes").select("id, title").ilike("title", pattern).limit(5),
      supabase.from("secure_wallet").select("id, title, type").ilike("title", pattern).limit(5),
    ]);

    const combined: SearchResult[] = [
      ...(passRes.data || []).map(r => ({ id: r.id, title: r.title, subtitle: r.category, vault: "passwords" as const })),
      ...(docRes.data  || []).map(r => ({ id: r.id, title: r.title, vault: "documents" as const })),
      ...(noteRes.data || []).map(r => ({ id: r.id, title: r.title, vault: "notes" as const })),
      ...(walletRes.data || []).filter(r => r.type !== "bank_account").map(r => ({ id: r.id, title: r.title, subtitle: r.type?.replace("_", " "), vault: "wallet" as const })),
      ...(walletRes.data || []).filter(r => r.type === "bank_account").map(r => ({ id: r.id, title: r.title, subtitle: "Bank Account", vault: "banks" as const })),
    ];

    setResults(combined);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      queueMicrotask(() => setResults([]));
      return;
    }
    debounceRef.current = setTimeout(() => search(query), 300);
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (result: SearchResult) => {
    onNavigate(result.vault, result.id);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search all vaults..."
        className="w-full h-10 pl-9 pr-9 rounded-xl bg-secondary border-transparent focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-[15px] text-foreground placeholder:text-muted-foreground"
      />
      {query && (
        <button onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
          <XIcon className="w-4 h-4" />
        </button>
      )}

      <AnimatePresence>
        {open && query.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 right-0 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {loading ? (
              <div className="p-4 text-center text-[14px] text-muted-foreground">Searching...</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-[14px] text-muted-foreground">No results found</div>
            ) : (
              <div className="py-1">
                {results.map((r, i) => {
                  const meta = VAULT_META[r.vault];
                  const Icon = meta.icon;
                  return (
                    <motion.button
                      key={r.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => handleSelect(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold text-foreground truncate">{r.title}</div>
                        {r.subtitle && (
                          <div className="text-[12px] text-muted-foreground capitalize">{r.subtitle}</div>
                        )}
                      </div>
                      <div className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color} shrink-0`}>
                        {meta.label}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
