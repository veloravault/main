/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { UserIcon, CameraIcon, Loader2Icon, CheckIcon, LogOutIcon, MoonIcon, SunIcon, Trash2Icon, AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

interface ProfileProps {
  onLogout?: () => void;
}

export function Profile({ onLogout }: ProfileProps) {
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Danger zone state
  const [showDeleteDataConfirm, setShowDeleteDataConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [dangerInput, setDangerInput] = useState("");
  const [dangerLoading, setDangerLoading] = useState(false);
  
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      setMounted(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setFullName(user.user_metadata?.full_name || "");
        setAvatarUrl(user.user_metadata?.avatar_url || null);
      }
      setLoading(false);
    }
    queueMicrotask(() => {
      void loadProfile();
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;
      setAvatarUrl(publicUrl);
    } catch (error: unknown) {
      console.error("Error uploading avatar:", error);
      alert(error instanceof Error ? error.message : "Failed to upload avatar.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (dangerInput !== "DELETE") return;
    setDangerLoading(true);
    try {
      await supabase.from("vault_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("secure_notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("secure_wallet").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      setShowDeleteDataConfirm(false);
      setDangerInput("");
      alert("All vault data has been permanently deleted.");
    } catch (err) {
      console.error("Delete data error:", err);
      alert("Failed to delete data. Please try again.");
    } finally {
      setDangerLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (dangerInput !== "DELETE") return;
    setDangerLoading(true);
    try {
      const res = await fetch("/api/delete-account", { method: "POST" });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to delete account");
      // Sign out and reload
      await supabase.auth.signOut();
      window.location.assign("/");
    } catch (err) {
      console.error("Delete account error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete account.");
      setDangerLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="apple-settings-layout apple-surface mx-auto max-w-5xl animate-in fade-in duration-500">
      <header className="mb-5 md:mb-7">
        <h2 className="hidden md:block type-section-title">Profile</h2>
        <p className="mt-1 text-[14px] text-muted-foreground">Your account, security and vault preferences.</p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <section data-settings-section="account" className="apple-group bg-card rounded-[22px] border border-border shadow-sm md:col-span-2 overflow-hidden">
          <p className="type-group-label px-5 pt-5">Account</p>
          <div className="grid gap-5 p-5 sm:grid-cols-[88px_1fr] sm:items-start">
            <button type="button" className="group justify-self-start text-left" onClick={() => fileInputRef.current?.click()} aria-label="Change profile photo">
              <span className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-muted shadow-inner">
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" /> : <UserIcon className="h-8 w-8 text-muted-foreground/50" />}
                <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"><CameraIcon className="h-5 w-5 text-white" /></span>
                {uploading && <span className="absolute inset-0 flex items-center justify-center bg-black/40"><Loader2Icon className="h-5 w-5 animate-spin text-white" /></span>}
              </span>
              <span className="mt-2 block text-center text-[13px] font-medium text-primary">Edit</span>
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />

            <div className="min-w-0">
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex flex-col gap-1 px-4 py-3 sm:grid sm:grid-cols-[120px_1fr] sm:items-center sm:gap-0">
                  <span className="text-[15px] font-medium text-foreground">Email</span>
                  <span className="truncate text-[15px] text-muted-foreground">{user?.email}</span>
                </div>
                <label className="flex flex-col gap-1 px-4 py-3 sm:grid sm:grid-cols-[120px_1fr] sm:items-center sm:gap-0">
                  <span className="text-[15px] font-medium text-foreground">Full name</span>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" className="w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/50" />
                </label>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleSave} disabled={saving || uploading} className="min-h-10 rounded-xl px-5 text-[14px] font-semibold shadow-sm">
                  {saving ? <Loader2Icon className="h-4 w-4 animate-spin" /> : success ? <><CheckIcon className="h-4 w-4" /> Saved</> : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section data-settings-section="security" className="apple-group bg-card rounded-[22px] border border-border shadow-sm overflow-hidden">
          <p className="type-group-label px-5 pt-5">Security</p>
          <div className="p-3">
            <div className="flex min-h-16 items-center justify-between gap-4 rounded-2xl px-3 py-2">
              <div><p className="text-[15px] font-medium">Vault session</p><p className="text-[13px] text-muted-foreground">Lock this device and return to sign in.</p></div>
              {onLogout && <Button variant="ghost" onClick={onLogout} className="shrink-0 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"><LogOutIcon className="h-4 w-4" /> Lock</Button>}
            </div>
          </div>
        </section>

        <section data-settings-section="appearance" className="apple-group bg-card rounded-[22px] border border-border shadow-sm overflow-hidden">
          <p className="type-group-label px-5 pt-5">Appearance</p>
          <div className="p-3">
            <div className="flex min-h-16 items-center justify-between gap-4 rounded-2xl px-3 py-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">{mounted && theme === "dark" ? <MoonIcon className="h-5 w-5 text-primary" /> : <SunIcon className="h-5 w-5 text-primary" />}</span>
                <div><p className="text-[15px] font-medium">Dark Mode</p><p className="text-[13px] text-muted-foreground">Match your preferred vault appearance.</p></div>
              </div>
              {mounted && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={theme === "dark"}
                  aria-label="Toggle dark mode"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className={`relative inline-flex h-[30px] w-[50px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
                    theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-[26px] w-[26px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      theme === "dark" ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              )}
            </div>
          </div>
        </section>

        <section data-settings-section="data" className="apple-group bg-card rounded-[22px] border border-border shadow-sm overflow-hidden">
          <p className="type-group-label px-5 pt-5">Data</p>
          <div className="p-3">
            <div className="flex flex-col gap-3 rounded-2xl px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-[15px] font-medium">Clear vault data</p><p className="text-[13px] text-muted-foreground">Erase passwords, notes, cards and bank accounts.</p></div>
              <Button variant="outline" onClick={() => { setShowDeleteDataConfirm(true); setDangerInput(""); setShowDeleteAccountConfirm(false); }} className="shrink-0 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2Icon className="h-4 w-4" /> Clear Data</Button>
            </div>
            {showDeleteDataConfirm && renderConfirmation("This will permanently erase all your vault data.", handleDeleteAllData, "Delete All Data")}
          </div>
        </section>

        <section data-settings-section="danger" className="apple-group rounded-[22px] border border-destructive/25 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-5 text-destructive"><AlertTriangleIcon className="h-4 w-4" /><p className="type-group-label text-destructive">Danger Zone</p></div>
          <div className="p-3">
            <div className="flex flex-col gap-3 rounded-2xl px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-[15px] font-medium">Delete account</p><p className="text-[13px] text-muted-foreground">Permanently remove your account and all vault data.</p></div>
              <Button variant="destructive" onClick={() => { setShowDeleteAccountConfirm(true); setDangerInput(""); setShowDeleteDataConfirm(false); }} className="shrink-0 rounded-xl"><Trash2Icon className="h-4 w-4" /> Delete Account</Button>
            </div>
            {showDeleteAccountConfirm && renderConfirmation("This will permanently delete your account and all vault data.", handleDeleteAccount, "Delete My Account")}
          </div>
        </section>
      </div>
    </div>
  );

  function renderConfirmation(message: string, action: () => Promise<void>, actionLabel: string) {
    return (
      <div className="m-3 mt-2 space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-[13px] font-medium">{message} Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm.</p>
        <input type="text" value={dangerInput} onChange={(e) => setDangerInput(e.target.value)} placeholder="Type DELETE" className="min-h-11 w-full rounded-xl border border-destructive/30 bg-background px-3 font-mono text-[14px] outline-none focus:ring-2 focus:ring-destructive/20" autoFocus />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { setShowDeleteDataConfirm(false); setShowDeleteAccountConfirm(false); setDangerInput(""); }} disabled={dangerLoading} className="rounded-xl">Cancel</Button>
          <Button variant="destructive" disabled={dangerInput !== "DELETE" || dangerLoading} onClick={action} className="rounded-xl font-semibold">{dangerLoading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : actionLabel}</Button>
        </div>
      </div>
    );
  }
}
