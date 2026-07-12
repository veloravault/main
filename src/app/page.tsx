"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { Auth } from "@/components/Auth";
import { PinLock, hasPinLock } from "@/components/PinLock";
import { Dashboard } from "@/components/Dashboard";
import { PasswordVault } from "@/components/PasswordVault";
import { DocumentVault } from "@/components/DocumentVault";
import { NotesVault } from "@/components/NotesVault";
import { WalletVault } from "@/components/WalletVault";
import { Profile } from "@/components/Profile";
import { clearAllCaches, getCache } from "@/lib/vaultCache";
import { clearKeyCache } from "@/lib/keyCache";
import { aiSearchVault } from "./actions";
import { User } from "@supabase/supabase-js";
import {
  KeyRoundIcon,
  FileTextIcon,
  LogOutIcon,
  FileIcon,
  UserCircleIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  SearchIcon,
  XIcon,
  SunIcon,
  MoonIcon,
  SparklesIcon,
  Loader2Icon,
  ArrowRightIcon,
  HashIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "dashboard" | "passwords" | "documents" | "notes" | "wallet" | "profile";

type SearchableVaultItem = {
  id: string;
  type: Tab;
  title: string;
  category?: string;
};

type CachedPassword = {
  id: string;
  title: string;
  category?: string;
};

type CachedDocument = {
  id: string;
  title: string;
  category?: string;
};

type CachedNote = {
  id: string;
  title: string;
  category?: string;
};

type CachedWallet = {
  id: string;
  title?: string;
  type?: string;
};

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { tab: "dashboard" as Tab, icon: LayoutDashboardIcon, label: "Dashboard" },
    ],
  },
  {
    label: "Vault",
    items: [
      { tab: "passwords" as Tab, icon: KeyRoundIcon,    label: "Passwords"  },
      { tab: "documents" as Tab, icon: FileTextIcon,    label: "Documents"  },
      { tab: "notes"     as Tab, icon: FileIcon,        label: "Notes"      },
      { tab: "wallet"    as Tab, icon: CreditCardIcon,  label: "Wallet"     },
    ],
  },
];

// All tabs for header title lookup and search (includes profile)
const ALL_TABS_WITH_PROFILE = [
  ...NAV_SECTIONS.flatMap(s => s.items),
  { tab: "profile" as Tab, icon: UserCircleIcon, label: "Profile" },
];

// Key used to store the master password in sessionStorage (cleared on tab close)
const SESSION_MASTER_KEY = "vault_session_master";

export default function Home() {
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [showPinLock, setShowPinLock] = useState(false);
  const [showFullAuth, setShowFullAuth] = useState(false);

  // Theme
  const { setTheme, resolvedTheme } = useTheme();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiSearching, setAiSearching] = useState(false);
  const [aiMatch, setAiMatch] = useState<{ id: string, title: string, type: Tab } | null>(null);
  const headerSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setSessionUser(user);

      if (user) {
        // 1. Try session memory (sessionStorage) -- survives refresh, cleared on tab close
        const sessionMaster = sessionStorage.getItem(SESSION_MASTER_KEY);
        if (sessionMaster) {
          setMasterPassword(sessionMaster);
          setLoading(false);
          return;
        }

        // 2. Show PIN lock if enrolled
        if (hasPinLock()) {
          setShowPinLock(true);
          setLoading(false);
          return;
        }
      }

      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSessionUser(session?.user ?? null);
      if (event === "SIGNED_OUT") {
        setMasterPassword(null);
        sessionStorage.removeItem(SESSION_MASTER_KEY);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Cmd+K -> open search overlay
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
        setAiMatch(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Auto-focus when search overlay opens
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => headerSearchRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  const handleLogin = (masterPass: string) => {
    setMasterPassword(masterPass);
    setShowPinLock(false);
    setShowFullAuth(false);
    // Store in sessionStorage so refresh doesn't re-prompt
    sessionStorage.setItem(SESSION_MASTER_KEY, masterPass);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearAllCaches();
    clearKeyCache();
    setMasterPassword(null);
    setShowPinLock(false);
    setShowFullAuth(false);
    sessionStorage.removeItem(SESSION_MASTER_KEY);
  };

  const handleNavigate = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setSearchOpen(false);
    setSearchQuery("");
    setAiMatch(null);
  }, []);

  const collectSearchItems = useCallback(async (): Promise<SearchableVaultItem[]> => {
    const cachedPasswords = getCache<CachedPassword>("vault_items") || [];
    const cachedDocuments = getCache<CachedDocument>("vault_documents") || [];
    const cachedNotes = getCache<CachedNote>("secure_notes") || [];
    const cachedWallet = getCache<CachedWallet>("secure_wallet") || [];

    const items: SearchableVaultItem[] = [
      ...cachedPasswords.map((p) => ({ id: p.id, type: "passwords" as Tab, title: p.title, category: p.category })),
      ...cachedDocuments.map((d) => ({ id: d.id, type: "documents" as Tab, title: d.title, category: d.category })),
      ...cachedNotes.map((n) => ({ id: n.id, type: "notes" as Tab, title: n.title, category: n.category })),
      ...cachedWallet.map((w) => ({ id: w.id, type: "wallet" as Tab, title: w.title || w.type || "Wallet item", category: "Wallet" })),
    ];

    if (items.length > 0) return items;

    const [passwords, documents, notes, wallet] = await Promise.all([
      supabase.from("vault_items").select("id, title, category").limit(50),
      supabase.from("vault_documents").select("id, title, category").limit(50),
      supabase.from("secure_notes").select("id, title, category").limit(50),
      supabase.from("secure_wallet").select("id, title, type").limit(50),
    ]);

    return [
      ...(passwords.data || []).map((p) => ({ id: p.id, type: "passwords" as Tab, title: p.title, category: p.category })),
      ...(documents.data || []).map((d) => ({ id: d.id, type: "documents" as Tab, title: d.title, category: d.category })),
      ...(notes.data || []).map((n) => ({ id: n.id, type: "notes" as Tab, title: n.title, category: n.category })),
      ...(wallet.data || []).map((w) => ({ id: w.id, type: "wallet" as Tab, title: w.title || w.type || "Wallet item", category: "Wallet" })),
    ];
  }, []);

  const handleAiSearch = useCallback(async () => {
    const currentQuery = searchQuery.trim();
    if (!currentQuery) return;
    
    setAiSearching(true);
    setAiMatch(null);

    try {
      const items = await collectSearchItems();
      const matchedId = await aiSearchVault(currentQuery, items);
      if (matchedId) {
        const match = items.find(i => i.id === matchedId);
        if (match) {
          setAiMatch({ id: match.id, title: match.title, type: match.type as Tab });
        }
      }
    } catch (err) {
      console.error("AI Search Error:", err);
    } finally {
      setAiSearching(false);
    }
  }, [collectSearchItems, searchQuery]);

  // Debounced AI Search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim()) {
        void handleAiSearch();
      } else {
        setAiMatch(null);
        setAiSearching(false);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [handleAiSearch, searchQuery]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <ShieldCheckIcon className="w-8 h-8 text-primary opacity-60" />
      </div>
    );
  }

  // PIN lock screen -- user has session + PIN enrolled
  if (sessionUser && !masterPassword && showPinLock && !showFullAuth) {
    return (
      <PinLock
        onUnlock={(mk) => {
          setMasterPassword(mk);
          sessionStorage.setItem(SESSION_MASTER_KEY, mk);
        }}
        onFallback={() => {
          setShowPinLock(false);
          setShowFullAuth(true);
        }}
      />
    );
  }

  if (!sessionUser || !masterPassword) {
    return <Auth onLogin={handleLogin} initialSessionActive={!!sessionUser} initialEmail={sessionUser?.email} />;
  }

  const sharedProps = { masterPassword };



  const avatarLetter = sessionUser.email?.charAt(0).toUpperCase() ?? "U";
  const avatarUrl = sessionUser.user_metadata?.avatar_url as string | undefined;
  const displayName = (sessionUser.user_metadata?.full_name as string | undefined) ?? sessionUser.email?.split("@")[0] ?? "";

  return (
    <div className="ios-app-shell flex h-screen w-full bg-background overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-60 hidden md:flex flex-col shrink-0 sidebar-vibrancy border-r"
        style={{ borderColor: "var(--sidebar-border)" }}>

        {/* App identity */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[9px] bg-primary flex items-center justify-center shadow-sm shrink-0">
              <ShieldCheckIcon className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-foreground">Telkar Vault</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-2 space-y-5">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <div className="px-2 pb-1 pt-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
                  {section.label}
                </span>
              </div>
              <div className="space-y-0.5">
                {section.items.map(({ tab, icon: Icon, label }) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => handleNavigate(tab)}
                      className={`relative w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-[8px] text-[14px] transition-colors ${
                        isActive
                          ? "text-primary font-semibold"
                          : "text-foreground/80 font-normal hover:bg-black/5 dark:hover:bg-white/6"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-pill"
                          className="absolute inset-0 rounded-[8px] bg-primary/10 dark:bg-primary/15"
                          transition={{ type: "spring", bounce: 0.15, duration: 0.38 }}
                        />
                      )}
                      <Icon
                        className={`relative z-10 w-[18px] h-[18px] shrink-0 transition-colors ${
                          isActive ? "text-primary" : "text-muted-foreground"
                        }`}
                        strokeWidth={isActive ? 2.25 : 1.75}
                      />
                      <span className="relative z-10">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User + Sign out */}
        <div className="border-t px-3 py-3 space-y-1" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="flex items-center gap-2.5 px-1.5 py-1">
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[12px] font-bold text-muted-foreground shrink-0 overflow-hidden">
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                : avatarLetter}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-foreground truncate leading-tight">{displayName}</div>
              <div className="text-[11px] text-muted-foreground truncate leading-tight">{sessionUser.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-[8px] text-[14px] text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
          >
            <LogOutIcon className="w-[16px] h-[16px] shrink-0" strokeWidth={1.75} />
            Sign Out
          </button>
        </div>
      </aside>


      {/* -- Main content -- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">

        {/* -- Header -- */}
        <header
          className="ios-mobile-header flex items-center gap-2 px-4 md:px-6 shrink-0 border-b sidebar-vibrancy"
          style={{ borderColor: "var(--border)", minHeight: "52px", height: "52px" }}
        >
          {/* Desktop: current section title */}
          <span className="text-[16px] font-semibold text-foreground hidden md:block tracking-tight">
            {ALL_TABS_WITH_PROFILE.find(t => t.tab === activeTab)?.label}
          </span>

          {/* Mobile: icon + current section name */}
          <div className="flex items-center gap-2.5 md:hidden min-w-0">
            <div className="w-[32px] h-[32px] rounded-[10px] bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/20">
              <ShieldCheckIcon className="w-[16px] h-[16px] text-white" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col justify-center leading-none min-w-0">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.14em]">
                Telkar Vault
              </span>
              <span className="text-[17px] font-semibold text-foreground tracking-tight leading-snug truncate">
                {ALL_TABS_WITH_PROFILE.find(t => t.tab === activeTab)?.label ?? "Home"}
              </span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Search -- pill on sm+ */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 h-[32px] px-3 rounded-[9px] bg-black/5 dark:bg-white/7 text-muted-foreground hover:bg-black/8 dark:hover:bg-white/10 transition-colors border border-black/5 dark:border-white/5"
          >
            <SearchIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[13px] hidden lg:block">Search</span>
            <span className="text-[11px] font-medium hidden lg:flex items-center gap-0.5 ml-1 opacity-50 bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">
              ⌘K
            </span>
          </button>

          {/* Mobile: search icon button 44px */}
          <button
            onClick={() => setSearchOpen(true)}
            className="sm:hidden w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 dark:hover:bg-white/7 active:scale-90 transition-all"
            aria-label="Search"
          >
            <SearchIcon className="w-[19px] h-[19px]" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-full md:rounded-[8px] hover:bg-black/5 dark:hover:bg-white/7 active:scale-90 transition-all text-muted-foreground"
            aria-label="Toggle theme"
          >
            <AnimatePresence mode="wait" initial={false}>
              {resolvedTheme === "dark" ? (
                <motion.span
                  key="sun"
                  initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
                  animate={{ rotate: 0,   opacity: 1, scale: 1   }}
                  exit={{   rotate: 90,   opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex"
                >
                  <SunIcon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </motion.span>
              ) : (
                <motion.span
                  key="moon"
                  initial={{ rotate: 90,  opacity: 0, scale: 0.7 }}
                  animate={{ rotate: 0,   opacity: 1, scale: 1   }}
                  exit={{   rotate: -90,  opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex"
                >
                  <MoonIcon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Profile avatar */}
          <button
            onClick={() => handleNavigate("profile")}
            className="relative w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-full shrink-0 active:scale-90 transition-transform"
            aria-label="Profile"
          >
            <div className={`w-[30px] h-[30px] rounded-full overflow-hidden flex items-center justify-center text-[12px] font-bold bg-secondary text-muted-foreground ring-2 transition-all ${
              activeTab === "profile" ? "ring-primary" : "ring-transparent"
            }`}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                : avatarLetter}
            </div>
          </button>
        </header>

        {/* ── Search overlay ─────────────────────────────────── */}
        <AnimatePresence>
          {searchOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="search-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-40 bg-black/40"
                style={{ backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
                onClick={() => { setSearchOpen(false); setSearchQuery(""); setAiMatch(null); }}
              />

              {/* Search panel */}
              <motion.div
                key="search-panel"
                initial={{ opacity: 0, y: -10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0,   scale: 1    }}
                exit={{   opacity: 0, y: -6,   scale: 0.97 }}
                transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
                className="fixed top-[calc(env(safe-area-inset-top,0px)+58px)] sm:top-[64px] left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 sm:w-full sm:max-w-[540px]"
              >
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.10)",
                  }}
                >
                  {/* Search input */}
                  <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    {aiSearching
                      ? <Loader2Icon className="w-[17px] h-[17px] text-primary shrink-0 animate-spin" strokeWidth={2} />
                      : <SearchIcon className="w-[17px] h-[17px] text-muted-foreground shrink-0" strokeWidth={1.75} />}
                    <input
                      ref={headerSearchRef}
                      type="text"
                      placeholder="Search passwords, notes, cards..."
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        if (aiMatch) setAiMatch(null);
                      }}
                      className="flex-1 bg-transparent text-[16px] text-foreground placeholder:text-muted-foreground/60 outline-none min-w-0"
                    />
                    {searchQuery ? (
                      <button
                        onClick={() => { setSearchQuery(""); setAiMatch(null); headerSearchRef.current?.focus(); }}
                        className="w-6 h-6 rounded-full bg-muted-foreground/15 flex items-center justify-center hover:bg-muted-foreground/25 transition-colors shrink-0"
                      >
                        <XIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    ) : (
                      <kbd className="hidden sm:flex items-center text-[11px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded border border-border shrink-0">
                        esc
                      </kbd>
                    )}
                  </div>

                  {/* Results area */}
                  <div className="overflow-y-auto" style={{ maxHeight: "min(420px, 55vh)" }}>

                    {/* AI searching state */}
                    {aiSearching && (
                      <div className="px-4 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <SparklesIcon className="w-4 h-4 text-primary" strokeWidth={2} />
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-foreground">Searching with AI&hellip;</p>
                          <p className="text-[12px] text-muted-foreground">Finding the best match in your vault</p>
                        </div>
                      </div>
                    )}

                    {/* AI match result */}
                    {aiMatch && !aiSearching && (() => {
                      const tabIcon = ALL_TABS_WITH_PROFILE.find(t => t.tab === aiMatch.type);
                      const TabIcon = tabIcon?.icon ?? HashIcon;
                      const typeColors: Record<string, string> = {
                        passwords: "bg-blue-500/10 text-blue-500 dark:bg-blue-500/15",
                        documents: "bg-orange-500/10 text-orange-500 dark:bg-orange-500/15",
                        notes:     "bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400",
                        wallet:    "bg-violet-500/10 text-violet-500 dark:bg-violet-500/15",
                        dashboard: "bg-primary/10 text-primary",
                        profile:   "bg-primary/10 text-primary",
                      };
                      const color = typeColors[aiMatch.type] ?? "bg-primary/10 text-primary";
                      return (
                        <div className="px-3 py-3">
                          <div className="flex items-center gap-2 px-1 mb-2">
                            <SparklesIcon className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
                            <span className="text-[11px] font-semibold text-primary uppercase tracking-widest">AI Match</span>
                          </div>
                          <button
                            onClick={() => handleNavigate(aiMatch.type)}
                            className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl hover:bg-muted/60 active:scale-[0.98] transition-all text-left group"
                            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                              <TabIcon className="w-5 h-5" strokeWidth={1.75} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-semibold text-foreground truncate">{aiMatch.title}</p>
                              <p className="text-[12px] text-muted-foreground capitalize mt-0.5">{tabIcon?.label ?? aiMatch.type}</p>
                            </div>
                            <ArrowRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" strokeWidth={2} />
                          </button>
                        </div>
                      );
                    })()}

                    {/* Section nav items */}
                    {!aiMatch && (
                      <div className="px-3 py-2">
                        {searchQuery && (
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                            Sections
                          </p>
                        )}
                        <div className="space-y-0.5">
                          {ALL_TABS_WITH_PROFILE.filter(t =>
                            !searchQuery || t.label.toLowerCase().includes(searchQuery.toLowerCase())
                          ).map(({ tab, icon: Icon, label }) => (
                            <button
                              key={tab}
                              onClick={() => handleNavigate(tab)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all active:scale-[0.98] group ${
                                activeTab === tab
                                  ? "bg-primary/8 dark:bg-primary/12"
                                  : "hover:bg-muted/60"
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                activeTab === tab ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                              }`}>
                                <Icon className="w-4 h-4" strokeWidth={1.75} />
                              </div>
                              <span className={`text-[14px] font-medium flex-1 ${
                                activeTab === tab ? "text-primary" : "text-foreground"
                              }`}>{label}</span>
                              {activeTab === tab && (
                                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                  Active
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {!aiSearching && !aiMatch && searchQuery && ALL_TABS_WITH_PROFILE.filter(t =>
                      t.label.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="px-4 py-8 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                          <SearchIcon className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                        </div>
                        <p className="text-[14px] font-medium text-foreground">No results for &ldquo;{searchQuery}&rdquo;</p>
                        <p className="text-[12px] text-muted-foreground mt-1">AI is searching your vault items&hellip;</p>
                      </div>
                    )}

                    {/* Footer hint */}
                    {!searchQuery && (
                      <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
                        <p className="text-[12px] text-muted-foreground text-center">
                          Type to search -- AI will find anything in your vault
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Scrollable content -- padded at bottom for mobile tab bar */}
        <div className="ios-content-scroll flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-7 py-4 sm:py-5 pb-32 md:pb-8">
            <AnimatePresence>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{   opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {activeTab === "dashboard" && <Dashboard  {...sharedProps} />}
                {activeTab === "passwords" && <PasswordVault {...sharedProps} />}
                {activeTab === "documents" && <DocumentVault {...sharedProps} />}
                {activeTab === "notes"     && <NotesVault {...sharedProps} />}
                {activeTab === "wallet"    && <WalletVault {...sharedProps} />}
                {activeTab === "profile"   && <Profile onLogout={handleLogout} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* ── Mobile bottom tab bar ────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t sidebar-vibrancy bg-background/80 backdrop-blur-xl"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="flex items-end justify-around px-2 pt-2"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
        >
          {NAV_SECTIONS.flatMap(s => s.items).map(({ tab, icon: Icon, label }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleNavigate(tab)}
                className="flex flex-col items-center gap-1 flex-1 py-1 min-w-0 min-h-[44px] justify-center active:scale-95 transition-transform duration-100"
                aria-label={label}
              >
                <div className="relative flex items-center justify-center w-12 h-7">
                  {isActive && (
                    <motion.div
                      layoutId="mobile-bg"
                      className="absolute inset-0 rounded-full bg-primary/12 dark:bg-primary/20"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.32 }}
                    />
                  )}
                  <Icon
                    className={`relative z-10 w-[22px] h-[22px] transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                    strokeWidth={isActive ? 2.25 : 1.6}
                  />
                </div>
                <span className={`text-[10px] font-medium transition-colors truncate max-w-[56px] leading-none ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                  {label === "Dashboard" ? "Home" : label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
