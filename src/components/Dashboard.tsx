/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { decryptText } from "@/lib/crypto";
import { getCache } from "@/lib/vaultCache";
import { getVaultHealthScore } from "@/lib/passwordHealth";
import { isBiometricsSupported, hasBiometricsEnabled, enableBiometrics } from "@/lib/biometrics";
import { DashboardSkeleton } from "@/components/Skeleton";
import {
  KeyRoundIcon,
  FileTextIcon,
  FileIcon,
  CreditCardIcon,
  StarIcon,
  ActivityIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  Loader2Icon,
  SparklesIcon,
  KeySquareIcon,
} from "lucide-react";
import { FaceIdIcon } from "@/components/Icons";
import { useVaultKey } from "@/components/auth/VaultKeyProvider";
import { useToast } from "@/components/Toast";
import { VAULT_TYPE_META, type VaultKind } from "@/lib/vaultTypeMeta";
import type { CredentialType } from "@/lib/credentialTypes";

interface DashboardProps {
  masterPassword: string;
  onNavigate?: (tab: "passwords" | "documents" | "notes" | "wallet") => void;
  /** The live, auth-listener-backed session user from VaultApp - passed down
   *  rather than re-fetched so the greeting can't go stale relative to name
   *  changes made elsewhere (e.g. Settings > Account). */
  sessionUser: User;
}

interface DashboardPassword {
  id: string;
  title: string;
  domain: string | null;
  category?: string;
  is_favorite: boolean;
  plaintext?: string;
  created_at: string;
}

interface DashboardPasswordRow {
  id: string;
  title: string;
  domain: string | null;
  category?: string;
  is_favorite: boolean;
  encrypted_data: string;
  iv: string;
  salt: string;
  created_at: string;
}

interface DashboardDocument {
  id: string;
  title: string;
  created_at: string;
}

interface DashboardNote {
  id: string;
  title: string;
  created_at: string;
}

interface DashboardWalletRow {
  id: string;
  title: string;
  type: "credit_card" | "bank_account";
  encrypted_content: string;
  iv: string;
  salt: string;
  created_at: string;
}

interface DashboardCredential {
  id: string;
  title: string;
  type: CredentialType;
  created_at: string;
}

interface RecentEntry {
  id: string;
  title: string;
  kind: VaultKind;
  createdAt: string;
  subtitle?: string;
  domain?: string | null;
}

interface DashboardWalletItem {
  id: string;
  title: string;
  type: "credit_card" | "bank_account";
  payload: {
    number?: string;
    account?: string;
  };
}

export function Dashboard({ masterPassword, onNavigate, sessionUser }: DashboardProps) {
  const toast = useToast();
  const { authenticatedUserId, isAuthenticatedUserCurrent } = useVaultKey();
  const [stats, setStats] = useState({
    passwords: 0,
    documents: 0,
    notes: 0,
    wallet: 0,
    credentials: 0,
  });

  const [recentActivity, setRecentActivity] = useState<RecentEntry[]>([]);
  const [favoritePasswords, setFavoritePasswords] = useState<DashboardPassword[]>([]);
  const [recentWallet, setRecentWallet] = useState<DashboardWalletItem[]>([]);
  const [recentNotes, setRecentNotes] = useState<DashboardNote[]>([]);
  const [healthPasswords, setHealthPasswords] = useState<{ id: string; plaintext: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const nameFromUser = sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || "User";
  const [fullName, setFullName] = useState(nameFromUser);
  const [showBioBanner, setShowBioBanner] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const firstName = fullName.split(' ')[0] || "User";

  // The dashboard greeting and Settings > Account both edit full_name, and
  // both stay mounted for the whole session (VaultApp hides inactive tabs
  // rather than unmounting them) - without this, a rename saved on the other
  // screen would never be picked up here, and a stale Save here could revert it.
  useEffect(() => { queueMicrotask(() => setFullName(nameFromUser)); }, [nameFromUser]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);

    try {
      // Check password cache first to avoid re-decrypting
      const cachedPasswords = getCache<DashboardPassword>("vault_items");

      const [passData, docData, notesData, walletData, credentialsData] = await Promise.all([
        cachedPasswords ? Promise.resolve({ data: null }) : supabase.from("vault_items").select("*").order("created_at", { ascending: false }),
        supabase.from("vault_documents").select("id, title, created_at").order("created_at", { ascending: false }),
        supabase.from("secure_notes").select("id, title, created_at").order("created_at", { ascending: false }),
        supabase.from("secure_wallet").select("*").order("created_at", { ascending: false }),
        supabase.from("secure_credentials").select("id, title, type, created_at").order("created_at", { ascending: false })
      ]);

      let passList: DashboardPassword[];
      if (cachedPasswords) {
        passList = cachedPasswords;
      } else {
        const rawPasswords = (passData.data || []) as DashboardPasswordRow[];
        passList = [];
        for (const row of rawPasswords) {
          try {
            const plaintext = await decryptText(row.encrypted_data, row.salt, row.iv, masterPassword);
            passList.push({ id: row.id, title: row.title, domain: row.domain, category: row.category, is_favorite: row.is_favorite, plaintext, created_at: row.created_at });
          } catch (err: unknown) {
            console.warn(`Failed to decrypt password ${row.title}`, err);
            passList.push({ id: row.id, title: row.title, domain: row.domain, category: row.category, is_favorite: row.is_favorite, plaintext: "Decryption Failed", created_at: row.created_at });
          }
        }
      }
      const docList = (docData.data || []) as DashboardDocument[];
      const notesList = (notesData.data || []) as DashboardNote[];
      const walletList = (walletData.data || []) as DashboardWalletRow[];
      const credentialsList = (credentialsData.data || []) as DashboardCredential[];

      setStats({
        passwords: passList.length,
        documents: docList.length,
        notes: notesList.length,
        wallet: walletList.length,
        credentials: credentialsList.length
      });

      // Favorites
      const favorites = passList.filter(p => p.is_favorite).slice(0, 4);
      setFavoritePasswords(favorites);

      // Recently Added - merge every vault type into one recency-sorted feed
      // (favorited passwords are already surfaced above, so skip them here)
      const activity: RecentEntry[] = [
        ...passList.filter(p => !p.is_favorite).map((p): RecentEntry => ({
          id: p.id, title: p.title, kind: "passwords", createdAt: p.created_at, domain: p.domain, subtitle: p.category || "Password",
        })),
        ...docList.map((d): RecentEntry => ({ id: d.id, title: d.title, kind: "documents", createdAt: d.created_at })),
        ...notesList.map((n): RecentEntry => ({ id: n.id, title: n.title, kind: "notes", createdAt: n.created_at })),
        ...walletList.map((w): RecentEntry => ({
          id: w.id, title: w.title, kind: w.type === "bank_account" ? "banks" : "wallet", createdAt: w.created_at,
        })),
        ...credentialsList.map((c): RecentEntry => ({ id: c.id, title: c.title, kind: c.type, createdAt: c.created_at })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecentActivity(activity.slice(0, 6));

      setRecentNotes(notesList.slice(0, 3));
      
      // Decrypt top 2 wallet items for preview
      const decryptedWallet: DashboardWalletItem[] = [];
      for (const item of walletList.slice(0, 2)) {
        try {
          const jsonStr = await decryptText(item.encrypted_content, item.salt, item.iv, masterPassword);
          decryptedWallet.push({
            id: item.id,
            title: item.title,
            type: item.type,
            payload: JSON.parse(jsonStr) as DashboardWalletItem["payload"]
          });
        } catch (e) {
          console.warn("Failed to decrypt wallet item", e);
        }
      }
      setRecentWallet(decryptedWallet);

      setHealthPasswords(
        passList
          .filter((p): p is DashboardPassword & { plaintext: string } => Boolean(p.plaintext) && p.plaintext !== "Decryption Failed")
          .map((p) => ({ id: p.id, plaintext: p.plaintext })),
      );

    } catch (error) {
      console.error("Dashboard fetch error:", error);
      toast("Some vault data couldn't be loaded. Try refreshing.", "error");
    } finally {
      setLoading(false);
    }
  }, [masterPassword, toast]);

  const health = useMemo(() => {
    if (healthPasswords.length === 0) return null;
    return getVaultHealthScore(healthPasswords);
  }, [healthPasswords]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchDashboardData();
    });
  }, [fetchDashboardData]);

  useEffect(() => {
    queueMicrotask(() => {
      setShowBioBanner(Boolean(
        authenticatedUserId &&
        isBiometricsSupported() &&
        !hasBiometricsEnabled(authenticatedUserId)
      ));
    });
  }, [authenticatedUserId]);

  const handleSaveName = async () => {
    if (isSavingName) return;
    const nextName = editNameValue.trim();
    if (!nextName) {
      toast("Enter your name before saving.", "error");
      return;
    }
    setIsSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: nextName }
      });
      if (error) throw error;
      setFullName(nextName);
      setIsEditingName(false);
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "Failed to update name", "error");
    } finally {
      setIsSavingName(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="apple-surface w-full space-y-5 sm:space-y-7 pb-10">

      {/* Greeting - clean, typographic, no background effects */}
      <div>
        <p className="text-[13px] sm:text-[14px] text-muted-foreground font-medium mb-0.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="hidden md:flex type-section-title text-foreground items-center gap-3">
          {isEditingName ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                className="bg-transparent border-b-2 border-primary outline-none focus:border-primary/80 transition-colors w-40 sm:w-60 text-foreground text-[26px] sm:text-[30px]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSaveName();
                  if (e.key === "Escape") setIsEditingName(false);
                }}
              />
              {isSavingName ? (
                <Loader2Icon className="w-5 h-5 animate-spin text-muted-foreground ml-2" />
              ) : (
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={handleSaveName} className="p-1.5 hover:bg-primary/10 rounded-lg text-primary transition-colors">
                    <CheckIcon className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsEditingName(false)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="group flex items-center gap-2">
              <span>Hello {firstName}</span>
              <button 
                onClick={() => {
                  setEditNameValue(fullName);
                  setIsEditingName(true);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-all"
                aria-label="Edit name"
              >
                <PencilIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </h1>
      </div>

      {/* Biometric setup banner */}
      {showBioBanner && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-[12px] bg-primary/20 flex items-center justify-center shrink-0">
            <FaceIdIcon className="w-[22px] h-[22px] text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-foreground">Enable Face ID / Touch ID</h3>
            <p className="text-[13px] text-muted-foreground mt-0.5 mb-3 leading-relaxed">
              Unlock Velora Vault instantly without entering your master key or PIN every time.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    if (!authenticatedUserId) throw new Error("Your authenticated account could not be verified.");
                    await enableBiometrics(masterPassword, authenticatedUserId, isAuthenticatedUserCurrent);
                    setShowBioBanner(false);
                  } catch (error: unknown) {
                    toast(error instanceof Error ? error.message : "Biometric setup could not be completed. Try again or continue with your master key.", "error");
                  }
                }}
                className="px-4 py-2 bg-primary text-primary-foreground text-[13px] font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Enable Now
              </button>
              <button
                onClick={() => setShowBioBanner(false)}
                className="px-4 py-2 bg-transparent text-muted-foreground hover:text-foreground text-[13px] font-medium rounded-lg hover:bg-muted transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Get-started state for a brand-new, empty vault */}
      {stats.passwords === 0 && stats.documents === 0 && stats.notes === 0 && stats.wallet === 0 && stats.credentials === 0 && (
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <SparklesIcon className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-[17px] font-semibold text-foreground">Your vault is empty</h2>
          <p className="text-[13px] text-muted-foreground mt-1 mb-4 max-w-[320px] mx-auto">
            Add your first password, document, note, or card to get started.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button onClick={() => onNavigate?.("passwords")} className="px-4 py-2 bg-primary text-primary-foreground text-[13px] font-semibold rounded-lg hover:opacity-90 transition-opacity">Add a password</button>
            <button onClick={() => onNavigate?.("documents")} className="px-4 py-2 bg-secondary text-foreground text-[13px] font-semibold rounded-lg hover:bg-muted transition-colors">Upload a document</button>
            <button onClick={() => onNavigate?.("notes")} className="px-4 py-2 bg-secondary text-foreground text-[13px] font-semibold rounded-lg hover:bg-muted transition-colors">Write a note</button>
            <button onClick={() => onNavigate?.("wallet")} className="px-4 py-2 bg-secondary text-foreground text-[13px] font-semibold rounded-lg hover:bg-muted transition-colors">Add a card</button>
          </div>
        </div>
      )}

      {/* Stats - iOS-style grouped inset list */}
      <div className="bg-card rounded-[16px] border border-border overflow-hidden">
        {[
          { label: "Passwords",  value: stats.passwords,  icon: KeyRoundIcon  },
          { label: "Documents",  value: stats.documents,  icon: FileTextIcon  },
          { label: "Notes",      value: stats.notes,      icon: FileIcon      },
          { label: "Wallet",     value: stats.wallet,     icon: CreditCardIcon },
          { label: "Credentials", value: stats.credentials, icon: KeySquareIcon },
        ].map(({ label, value, icon: Icon }, i, arr) => (
          <div key={label} className={`flex items-center justify-between px-5 py-4 ${
            i < arr.length - 1 ? "border-b border-border" : ""
          }`}>
            <div className="flex items-center gap-3">
              <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-[15px] text-foreground">{label}</span>
            </div>
            <span className="text-[15px] font-semibold text-foreground tabular-nums">{value}</span>
          </div>
        ))}
        {health && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-border">
            <div className="flex items-center gap-3">
              <ActivityIcon className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-[15px] text-foreground">Security Health</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${health.score}%` }}
                />
              </div>
              <span className="text-[15px] font-semibold text-primary tabular-nums w-8 text-right">{health.score}</span>
            </div>
          </div>
        )}
      </div>

      {/* Favorites */}
      {favoritePasswords.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-2 px-1">Favorites</p>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {favoritePasswords.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${i < favoritePasswords.length - 1 ? "border-b border-border" : ""}`}>
                {/* Favicon icon cell */}
                <div className="w-10 h-10 rounded-[10px] bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                  <span className="text-[16px] font-bold text-muted-foreground">
                    {p.title?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-foreground truncate">{p.title}</div>
                  <div className="text-[13px] text-muted-foreground truncate">{p.category || "Password"}</div>
                </div>
                <StarIcon className="w-4 h-4 text-primary fill-primary shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Added - unified feed across every vault type */}
      {recentActivity.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-2 px-1">Recently Added</p>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {recentActivity.map((entry, i) => {
              const meta = VAULT_TYPE_META[entry.kind];
              const Icon = meta.icon;
              return (
                <div key={`${entry.kind}-${entry.id}`} className={`flex items-center gap-3 px-4 py-3 ${i < recentActivity.length - 1 ? "border-b border-border" : ""}`}>
                  {entry.kind === "passwords" ? (
                    <div className="w-10 h-10 rounded-[10px] bg-secondary flex items-center justify-center shrink-0 border border-border overflow-hidden relative">
                      <span className="text-[17px] font-bold text-foreground/50">
                        {entry.title?.charAt(0).toUpperCase()}
                      </span>
                      {entry.domain && (
                        <img
                          src={`https://unavatar.io/${entry.domain}?fallback=false`}
                          alt=""
                          className="absolute inset-0 w-full h-full object-contain bg-white dark:bg-transparent"
                          onError={e => { e.currentTarget.style.display = "none"; }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className={`w-10 h-10 rounded-[10px] bg-gradient-to-b ${meta.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                      <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium text-foreground truncate">{entry.title}</div>
                    <div className="text-[13px] text-muted-foreground truncate">{entry.subtitle || meta.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wallet + Notes side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {recentWallet.length > 0 && (
          <div>
            <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-2 px-1">Wallet</p>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {recentWallet.map((item, i) => {
                const meta = item.type === "credit_card" ? VAULT_TYPE_META.wallet : VAULT_TYPE_META.banks;
                const Icon = meta.icon;
                return (
                <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${i < recentWallet.length - 1 ? "border-b border-border" : ""}`}>
                  <div className={`w-10 h-10 rounded-[10px] bg-gradient-to-b ${meta.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium text-foreground truncate">{item.title}</div>
                    <div className="text-[13px] text-muted-foreground font-mono tracking-wider">
                      {item.type === "credit_card"
                        ? `•••• ${item.payload.number?.slice(-4) ?? "XXXX"}`
                        : `•••• ${item.payload.account?.slice(-4) ?? "XXXX"}`
                      }
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {recentNotes.length > 0 && (
          <div>
            <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-2 px-1">Notes</p>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {recentNotes.map((n, i) => (
                <div key={n.id} className={`flex items-center gap-3 px-4 py-3 ${i < recentNotes.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-orange-500 to-destructive flex items-center justify-center shrink-0 shadow-sm">
                    <FileIcon className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium text-foreground truncate">{n.title}</div>
                    <div className="text-[13px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
