"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Auth } from "@/components/Auth";
import { PinLock, hasPinLock } from "@/components/PinLock";
import { Dashboard } from "@/components/Dashboard";
import { PasswordVault } from "@/components/PasswordVault";
import { DocumentVault } from "@/components/DocumentVault";
import { NotesVault } from "@/components/NotesVault";
import { WalletVault } from "@/components/WalletVault";
import { BankVault } from "@/components/BankVault";
import { Settings } from "@/components/settings/Settings";
import { MobileVaultMenu } from "@/components/MobileVaultMenu";
import { GlobalMagicImport } from "@/components/GlobalMagicImport";
import { clearLocalVaultSession } from "@/lib/vaultSession";
import { useAutoLock } from "@/hooks/useAutoLock";
import { useConnectivity } from "@/hooks/useConnectivity";
import { ConnectivityBanner } from "@/components/ConnectivityBanner";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useVaultKey } from "@/components/auth/VaultKeyProvider";
import { User } from "@supabase/supabase-js";
import {
  KeyRoundIcon,
  FileTextIcon,
  LogOutIcon,
  SparklesIcon,
  FileIcon,
  UserCircleIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  SearchIcon,
  SunIcon,
  MoonIcon,
  Wand2Icon,
  BuildingIcon,
} from "lucide-react";
import { VeloraMark } from "@/components/VeloraMark";
import { PresetAvatar, isAvatarKind } from "@/components/PresetAvatar";
import type { SettingsAutoUpgrade } from "@/components/settings/settings-types";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";

type Tab = "dashboard" | "passwords" | "documents" | "notes" | "wallet" | "banks" | "profile";

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
      { tab: "banks"     as Tab, icon: BuildingIcon,    label: "Bank Accounts" },
    ],
  },
];

// All tabs for header title lookup and search (includes profile)
const ALL_TABS_WITH_PROFILE = [
  ...NAV_SECTIONS.flatMap(s => s.items),
  { tab: "profile" as Tab, icon: UserCircleIcon, label: "Settings" },
];

export default function VaultApp() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const { authenticatedUserId, masterKey: masterPassword, setMasterKey, clearMasterKey } = useVaultKey();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [showPinLock, setShowPinLock] = useState(false);
  const [showFullAuth, setShowFullAuth] = useState(false);

  // Theme
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [searchOpen, setSearchOpen] = useState(false);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [isGlobalImportOpen, setIsGlobalImportOpen] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [settingsAutoUpgrade, setSettingsAutoUpgrade] = useState<SettingsAutoUpgrade | null>(null);
  // Undefined by default (not "account") so Settings keeps its normal
  // behavior — no forced section, mobile shows the section picker first —
  // until something explicitly asks to jump to a section (sidebar "Upgrade
  // plan", or a post-onboarding ?upgrade= param).
  const [settingsInitialSection, setSettingsInitialSection] = useState<"account" | "plan" | undefined>(undefined);
  const [settingsSectionRequestId, setSettingsSectionRequestId] = useState(0);
  const requestSettingsSection = useCallback((section: "account" | "plan") => {
    setSettingsInitialSection(section);
    setSettingsSectionRequestId((id) => id + 1);
  }, []);
  const connectivity = useConnectivity();
  const wasOnline = useRef(connectivity.isOnline);

  useEffect(() => {
    clearLocalVaultSession();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      const pinEnabled = Boolean(user && hasPinLock(user.id));
      setSessionUser(user);
      setShowPinLock(pinEnabled);
      setShowFullAuth(Boolean(user) && !pinEnabled);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      const pinEnabled = Boolean(nextUser && hasPinLock(nextUser.id));
      setSessionUser(nextUser);
      setShowPinLock(pinEnabled);
      setShowFullAuth(Boolean(nextUser) && !pinEnabled);
      if (event === "SIGNED_OUT") {
        clearMasterKey();
        clearLocalVaultSession();
      }
    });
    return () => subscription.unsubscribe();
  }, [clearMasterKey]);

  // ?upgrade=plus&period=monthly -> land straight on Plan & usage with
  // checkout auto-triggered, instead of the plain dashboard. Set by the
  // pricing page (signed-in users) or onboarding completion (new users who
  // picked a paid plan before signing up).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("upgrade");
    const period = params.get("period");
    if (plan === "plus" && (period === "monthly" || period === "yearly")) {
      window.history.replaceState(null, "", "/vault");
      queueMicrotask(() => {
        setActiveTab("profile");
        requestSettingsSection("plan");
        setSettingsAutoUpgrade({ plan, period });
      });
    }
  }, [requestSettingsSection]);

  // Cmd+K -> open search overlay
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLogin = (masterPass: string, expectedUserId: string): boolean => {
    if (!setMasterKey(masterPass, expectedUserId)) return false;
    setShowPinLock(false);
    setShowFullAuth(false);
    return true;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearLocalVaultSession();
    clearMasterKey();
    setShowPinLock(false);
    setShowFullAuth(false);
  };

  const handleLockVault = useCallback(() => {
    clearLocalVaultSession();
    clearMasterKey();
    const pinEnabled = authenticatedUserId ? hasPinLock(authenticatedUserId) : false;
    setShowPinLock(pinEnabled);
    setShowFullAuth(!pinEnabled);
    setSearchOpen(false);
    setIsGlobalImportOpen(false);
  }, [authenticatedUserId, clearMasterKey]);

  useAutoLock({ enabled: Boolean(sessionUser && masterPassword), onLock: handleLockVault });

  useEffect(() => {
    if (!wasOnline.current && connectivity.isOnline) setRefreshVersion((version) => version + 1);
    wasOnline.current = connectivity.isOnline;
  }, [connectivity.isOnline]);

  useEffect(() => {
    if (!loading && !sessionUser) {
      router.replace("/login?next=/vault");
    }
  }, [loading, router, sessionUser]);

  const handleNavigate = useCallback((tab: Tab, id?: string) => {
    setActiveTab(tab);
    setSearchOpen(false);
    setFocusedItemId(id || null);
  }, []);

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [activeTab]);

  if (loading || !sessionUser || !authenticatedUserId || sessionUser.id !== authenticatedUserId) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <ShieldCheckIcon className="w-8 h-8 text-primary opacity-60" />
      </div>
    );
  }

  // PIN lock screen -- user has session + PIN enrolled
  if (sessionUser && !masterPassword && showPinLock && !showFullAuth) {
    return (
      <PinLock
        key={authenticatedUserId}
        authenticatedUserId={authenticatedUserId}
        onUnlock={handleLogin}
        onFallback={() => {
          setShowPinLock(false);
          setShowFullAuth(true);
        }}
      />
    );
  }

  if (!masterPassword) {
    return <Auth key={authenticatedUserId} onLogin={handleLogin} />;
  }

  const sharedProps = { masterPassword, focusedItemId, onNavigate: handleNavigate };
  const refreshableProps = { masterPassword, focusedItemId, refreshVersion };



  const avatarKind = isAvatarKind(sessionUser.user_metadata?.avatar_kind) ? sessionUser.user_metadata.avatar_kind : null;
  const displayName = (sessionUser.user_metadata?.full_name as string | undefined) ?? sessionUser.email?.split("@")[0] ?? "";
  const activeTitle = ALL_TABS_WITH_PROFILE.find((item) => item.tab === activeTab)?.label ?? "Dashboard";

  return (
    <div className="ios-app-shell apple-app flex h-dvh w-full overflow-hidden">
      <ConnectivityBanner isOnline={connectivity.isOnline} />

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="apple-sidebar w-60 hidden md:flex flex-col shrink-0 sidebar-vibrancy border-r"
        style={{ borderColor: "var(--sidebar-border)" }}>

        {/* App identity */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <VeloraMark className="velora-brand-mark h-8 w-8 shrink-0" aria-hidden="true" />
            <span className="text-[15px] font-semibold tracking-tight text-foreground">Velora Vault</span>
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
            <div className="w-7 h-7 rounded-full shrink-0 overflow-hidden">
              <PresetAvatar kind={avatarKind} name={displayName} email={sessionUser.email} title={displayName} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-foreground truncate leading-tight">{displayName}</div>
              <div className="text-[11px] text-muted-foreground truncate leading-tight">{sessionUser.email}</div>
            </div>
          </div>
          <button
            onClick={() => { requestSettingsSection("plan"); handleNavigate("profile"); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-[8px] text-[14px] text-primary hover:bg-primary/8 transition-colors"
          >
            <SparklesIcon className="w-[16px] h-[16px] shrink-0" strokeWidth={1.75} />
            Upgrade plan
          </button>
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
        <header className="vault-header">
          <div className="vault-header-leading">
            <span className="vault-header-title">{activeTitle}</span>
          </div>

          <button type="button" onClick={() => setSearchOpen(true)} className="vault-header-search" aria-label="Search your vault">
            <SearchIcon aria-hidden="true" />
            <span>Search your vault</span>
            <kbd>⌘K</kbd>
          </button>

          <div className="vault-header-actions">
            <button type="button" onClick={() => setIsGlobalImportOpen(true)} className="vault-header-import">
              <Wand2Icon aria-hidden="true" /><span>Magic Import</span>
            </button>
            <button type="button" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="vault-header-icon vault-header-theme" aria-label="Toggle theme">
              {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <button type="button" onClick={() => handleNavigate("profile")} className="vault-header-profile" aria-label="Open profile">
              <span className={activeTab === "profile" ? "is-active" : ""}><PresetAvatar kind={avatarKind} name={displayName} email={sessionUser.email} title={displayName} /></span>
            </button>
            <button type="button" onClick={() => setSearchOpen(true)} className="vault-header-icon vault-header-mobile-search" aria-label="Search"><SearchIcon /></button>
            <div className="md:hidden"><MobileVaultMenu theme={theme} setTheme={setTheme} onNavigateBanks={() => handleNavigate("banks")} onNavigateSettings={() => handleNavigate("profile")} onMagicImport={() => setIsGlobalImportOpen(true)} onLock={handleLockVault} /></div>

          </div>
        </header>

        {/* ── Search overlay ─────────────────────────────────── */}
        {typeof document !== "undefined" && createPortal(<AnimatePresence>
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
                onClick={() => setSearchOpen(false)}
              />

              {/* Search panel */}
              <motion.div
                key="search-panel"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.96 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
                transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", bounce: 0.15, duration: 0.3 }}
                className="vault-command-palette"
                role="dialog"
                aria-modal="true"
                aria-label="Search the vault"
              >
                <div
                  className="vault-command-surface"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.10)",
                    padding: "14px",
                  }}
                >
                  <GlobalSearch onNavigate={handleNavigate} autoFocus />

                  {/* Jump to a section */}
                  <div className="px-1 pt-4">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-2">
                      Jump to
                    </p>
                    <div className="space-y-0.5">
                      {ALL_TABS_WITH_PROFILE.map(({ tab, icon: Icon, label }) => (
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
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>, document.body)}

        {/* ── Scrollable content — all tabs always mounted, hidden via display:none */}
        <div ref={contentScrollRef} className="ios-content-scroll flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-7 py-4 sm:py-5 pb-32 md:pb-8">
            <div style={{ display: activeTab === "dashboard" ? undefined : "none" }}><Dashboard  {...sharedProps} /></div>
            <div style={{ display: activeTab === "passwords" ? undefined : "none" }}><PasswordVault {...refreshableProps} /></div>
            <div style={{ display: activeTab === "documents" ? undefined : "none" }}><DocumentVault {...refreshableProps} /></div>
            <div style={{ display: activeTab === "notes"     ? undefined : "none" }}><NotesVault {...refreshableProps} /></div>
            <div style={{ display: activeTab === "wallet"    ? undefined : "none" }}><WalletVault {...refreshableProps} /></div>
            <div style={{ display: activeTab === "banks"     ? undefined : "none" }}><BankVault {...refreshableProps} /></div>
            <div style={{ display: activeTab === "profile"   ? undefined : "none" }}><Settings masterPassword={masterPassword} onLock={handleLockVault} initialSection={settingsInitialSection} sectionRequestId={settingsSectionRequestId} autoUpgrade={settingsAutoUpgrade} /></div>
          </div>
        </div>

      </main>

      {/* ── Mobile bottom tab bar ────────────────────────── */}
      <nav
        className="apple-tabbar md:hidden fixed bottom-0 left-0 right-0 z-40 sidebar-vibrancy bg-background/80 backdrop-blur-xl"
        style={{ borderColor: "var(--border)" }}
        aria-label="Primary navigation"
      >
        <div
          className="flex items-end justify-around px-2 pt-2"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
        >
          {NAV_SECTIONS.flatMap(s => s.items).filter(item => item.tab !== "banks").map(({ tab, icon: Icon, label }) => {
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

      {/* Global AI Magic Import Modal */}
      <GlobalMagicImport
        isOpen={isGlobalImportOpen}
        onOpenChange={setIsGlobalImportOpen}
        masterPassword={masterPassword}
        onSuccess={() => {
          // Force remount of active vault by briefly switching away and back
          setActiveTab(prev => {
            const saved = prev;
            setTimeout(() => setActiveTab(saved), 50);
            return "dashboard";
          });
        }}
      />
    </div>
  );
}
