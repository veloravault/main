/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { decryptText } from "@/lib/crypto";
import { getCache, setCache } from "@/lib/vaultCache";
import { getVaultHealthScore } from "@/lib/passwordHealth";
import { isBiometricsSupported, hasBiometricsEnabled, enableBiometrics } from "@/lib/biometrics";
import { DashboardSkeleton } from "@/components/Skeleton";
import { 
  KeyRoundIcon, 
  FileTextIcon, 
  FileIcon, 
  CreditCardIcon,
  StarIcon,
  BuildingIcon,
  ActivityIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  Loader2Icon
} from "lucide-react";
import { FaceIdIcon } from "@/components/Icons";

interface DashboardProps {
  masterPassword: string;
}

interface DashboardPassword {
  id: string;
  title: string;
  domain: string | null;
  category?: string;
  is_favorite: boolean;
  plaintext?: string;
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

export function Dashboard({ masterPassword }: DashboardProps) {
  const [stats, setStats] = useState({
    passwords: 0,
    documents: 0,
    notes: 0,
    wallet: 0
  });
  
  const [recentPasswords, setRecentPasswords] = useState<DashboardPassword[]>([]);
  const [favoritePasswords, setFavoritePasswords] = useState<DashboardPassword[]>([]);
  const [recentWallet, setRecentWallet] = useState<DashboardWalletItem[]>([]);
  const [recentNotes, setRecentNotes] = useState<DashboardNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("User");
  const [showBioBanner, setShowBioBanner] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const firstName = fullName.split(' ')[0] || "User";

  useEffect(() => {
    if (isBiometricsSupported() && !hasBiometricsEnabled()) {
      setShowBioBanner(true);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    
    // Get user info
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setFullName(user.user_metadata?.full_name || user.email?.split('@')[0] || "User");
    }

    try {
      // Check password cache first to avoid re-decrypting
      const cachedPasswords = getCache<DashboardPassword>("vault_items");

      const [passData, docData, notesData, walletData] = await Promise.all([
        cachedPasswords ? Promise.resolve({ data: null }) : supabase.from("vault_items").select("*").order("created_at", { ascending: false }),
        supabase.from("vault_documents").select("id, title, created_at").order("created_at", { ascending: false }),
        supabase.from("secure_notes").select("id, title, created_at").order("created_at", { ascending: false }),
        supabase.from("secure_wallet").select("*").order("created_at", { ascending: false })
      ]);

      const passList = cachedPasswords ?? ((passData.data || []) as DashboardPassword[]);
      const docList = (docData.data || []) as DashboardDocument[];
      const notesList = (notesData.data || []) as DashboardNote[];
      const walletList = (walletData.data || []) as DashboardWalletRow[];

      setStats({
        passwords: passList.length,
        documents: docList.length,
        notes: notesList.length,
        wallet: walletList.length
      });

      // Favorites
      const favorites = passList.filter(p => p.is_favorite).slice(0, 4);
      setFavoritePasswords(favorites);

      // Recents (Top 3)
      setRecentPasswords(passList.filter(p => !p.is_favorite).slice(0, 3));
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
          console.error("Failed to decrypt wallet item", e);
        }
      }
      setRecentWallet(decryptedWallet);

      // Store plain password list for health calc if we fetched fresh
      if (!cachedPasswords && passList.length > 0) {
        setCache("vault_items_titles", passList);
      }

    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [masterPassword]);

  const health = useMemo(() => {
    const cached = getCache<{id: string; plaintext: string}>("vault_items");
    if (!cached || cached.length === 0) return null;
    return getVaultHealthScore(cached);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchDashboardData();
    });
  }, [fetchDashboardData]);

  const handleSaveName = async () => {
    if (!editNameValue.trim()) return;
    setIsSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: editNameValue.trim() }
      });
      if (error) throw error;
      setFullName(editNameValue.trim());
      setIsEditingName(false);
    } catch (err: any) {
      alert(err.message || "Failed to update name");
    } finally {
      setIsSavingName(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="w-full space-y-5 sm:space-y-7 pb-10">

      {/* Greeting — clean, typographic, no background effects */}
      <div>
        <p className="text-[13px] sm:text-[14px] text-muted-foreground font-medium mb-0.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-[30px] sm:text-[32px] font-bold tracking-tight text-foreground flex items-center gap-3">
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
              Unlock Telkar Vault instantly without entering your master key or PIN every time.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    await enableBiometrics(masterPassword);
                    setShowBioBanner(false);
                  } catch (err: any) {
                    alert(err.message);
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

      {/* Stats — iOS-style grouped inset list */}
      <div className="bg-card rounded-[16px] border border-border overflow-hidden">
        {[
          { label: "Passwords",  value: stats.passwords,  icon: KeyRoundIcon  },
          { label: "Documents",  value: stats.documents,  icon: FileTextIcon  },
          { label: "Notes",      value: stats.notes,      icon: FileIcon      },
          { label: "Wallet",     value: stats.wallet,     icon: CreditCardIcon },
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
                  {p.domain ? (
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=64`}
                      alt=""
                      className="w-6 h-6 object-contain"
                      onError={e => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : (
                    <span className="text-[16px] font-bold text-muted-foreground">
                      {p.title?.charAt(0).toUpperCase()}
                    </span>
                  )}
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

      {/* Recently Added Passwords */}
      {recentPasswords.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-2 px-1">Recently Added</p>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {recentPasswords.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${i < recentPasswords.length - 1 ? "border-b border-border" : ""}`}>
                <div className="w-10 h-10 rounded-[10px] bg-secondary flex items-center justify-center shrink-0 border border-border overflow-hidden relative">
                  <span className="text-[17px] font-bold text-foreground/50">
                    {p.title?.charAt(0).toUpperCase()}
                  </span>
                  {p.domain && (
                    <img
                      src={`https://unavatar.io/${p.domain}?fallback=false`}
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain bg-white dark:bg-transparent"
                      onError={e => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-foreground truncate">{p.title}</div>
                  <div className="text-[13px] text-muted-foreground">{p.category || "Password"}</div>
                </div>
                <KeyRoundIcon className="w-4 h-4 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wallet + Notes side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {recentWallet.length > 0 && (
          <div>
            <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-2 px-1">Wallet</p>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {recentWallet.map((item, i) => (
                <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${i < recentWallet.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="w-10 h-10 rounded-[10px] bg-secondary flex items-center justify-center shrink-0 border border-border">
                    {item.type === "credit_card"
                      ? <CreditCardIcon className="w-5 h-5 text-foreground/80" strokeWidth={1.75} />
                      : <BuildingIcon   className="w-5 h-5 text-foreground/80" strokeWidth={1.75} />
                    }
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
              ))}
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
