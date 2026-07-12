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
      window.location.href = "/";
    } catch (err) {
      console.error("Delete account error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete account.");
      setDangerLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-2">Profile</h2>
        <p className="text-muted-foreground text-[15px]">Manage your personal information and preferences.</p>
      </div>

      <div className="bg-card rounded-3xl p-8 border border-border shadow-sm">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-32 h-32 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center relative shadow-inner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-12 h-12 text-muted-foreground/50" />
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <CameraIcon className="w-8 h-8 text-white" />
                </div>
                
                {/* Uploading state */}
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                    <Loader2Icon className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
              <p className="text-[13px] font-medium text-center text-primary mt-3 group-hover:underline">
                Change Photo
              </p>
            </div>
          </div>

          {/* Form Section */}
          <div className="flex-1 space-y-6 w-full">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-widest ml-1">Email Address</label>
              <div className="w-full bg-muted/50 rounded-xl px-4 py-3 text-[15px] text-muted-foreground border border-transparent select-none">
                {user?.email}
              </div>
              <p className="text-[12px] text-muted-foreground ml-1">Email cannot be changed.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-widest ml-1">Full Name</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Apple Seed"
                className="w-full bg-background rounded-xl px-4 py-3 text-[15px] text-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50"
              />
            </div>
            
            <div className="pt-4 border-t border-border flex justify-between items-center">
              {onLogout ? (
                <Button 
                  variant="ghost" 
                  onClick={onLogout}
                  className="rounded-xl px-4 py-5 text-[15px] font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 flex items-center gap-2"
                >
                  <LogOutIcon className="w-5 h-5" />
                  Lock & Sign Out
                </Button>
              ) : <div />}
              <Button 
                onClick={handleSave} 
                disabled={saving || uploading}
                className="rounded-xl px-6 py-5 text-[15px] font-semibold shadow-sm flex items-center gap-2"
              >
                {saving ? (
                  <Loader2Icon className="w-5 h-5 animate-spin" />
                ) : success ? (
                  <><CheckIcon className="w-5 h-5" /> Saved</>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>

        </div>
      </div>

      <div className="bg-card rounded-3xl p-8 border border-border shadow-sm">
        <h3 className="text-xl font-semibold tracking-tight text-foreground mb-6">Appearance</h3>
        
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-transparent">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shadow-sm border border-border/50">
              {mounted && theme === 'dark' ? (
                <MoonIcon className="w-5 h-5 text-primary" />
              ) : (
                <SunIcon className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <p className="text-[15px] font-semibold text-foreground">Dark Mode</p>
              <p className="text-[13px] text-muted-foreground">Adjust the appearance of your vault.</p>
            </div>
          </div>
          
          {mounted && (
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/20 ${theme === 'dark' ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-300 ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          )}
        </div>
      </div>
      {/* Danger Zone */}
      <div className="bg-card rounded-3xl p-8 border border-destructive/30 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangleIcon className="w-5 h-5 text-destructive" />
          <h3 className="text-xl font-semibold tracking-tight text-destructive">Danger Zone</h3>
        </div>
        <p className="text-[14px] text-muted-foreground mb-6">These actions are permanent and cannot be undone.</p>

        <div className="space-y-3">
          {/* Delete All Data */}
          <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-muted/30">
            <div>
              <p className="text-[15px] font-semibold text-foreground">Delete All Vault Data</p>
              <p className="text-[13px] text-muted-foreground mt-0.5">Permanently erase all passwords, notes, cards and bank accounts. Your account stays active.</p>
            </div>
            <Button
              variant="outline"
              onClick={() => { setShowDeleteDataConfirm(true); setDangerInput(""); setShowDeleteAccountConfirm(false); }}
              className="ml-4 shrink-0 border-destructive/40 text-destructive hover:bg-destructive hover:text-white rounded-xl"
            >
              <Trash2Icon className="w-4 h-4 mr-2" />
              Clear Data
            </Button>
          </div>

          {/* Delete Account */}
          <div className="flex items-center justify-between p-4 rounded-2xl border border-destructive/20 bg-destructive/5">
            <div>
              <p className="text-[15px] font-semibold text-foreground">Delete Account</p>
              <p className="text-[13px] text-muted-foreground mt-0.5">Permanently delete your account and ALL data. This cannot be reversed.</p>
            </div>
            <Button
              variant="destructive"
              onClick={() => { setShowDeleteAccountConfirm(true); setDangerInput(""); setShowDeleteDataConfirm(false); }}
              className="ml-4 shrink-0 rounded-xl"
            >
              <Trash2Icon className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </div>

        {/* Confirmation Panel */}
        {(showDeleteDataConfirm || showDeleteAccountConfirm) && (
          <div className="mt-5 p-5 rounded-2xl border border-destructive/40 bg-destructive/5 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangleIcon className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-semibold text-foreground">
                  {showDeleteAccountConfirm
                    ? "This will permanently delete your account and ALL vault data."
                    : "This will permanently erase all your vault data."}
                </p>
                <p className="text-[13px] text-muted-foreground mt-1">Type <span className="font-mono font-bold text-destructive">DELETE</span> below to confirm.</p>
              </div>
            </div>
            <input
              type="text"
              value={dangerInput}
              onChange={(e) => setDangerInput(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full bg-background border border-destructive/40 rounded-xl px-4 py-3 text-[15px] font-mono focus:outline-none focus:ring-2 focus:ring-destructive/30 transition-all"
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => { setShowDeleteDataConfirm(false); setShowDeleteAccountConfirm(false); setDangerInput(""); }}
                className="flex-1 rounded-xl"
                disabled={dangerLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={dangerInput !== "DELETE" || dangerLoading}
                onClick={showDeleteAccountConfirm ? handleDeleteAccount : handleDeleteAllData}
                className="flex-1 rounded-xl font-semibold"
              >
                {dangerLoading ? (
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                ) : showDeleteAccountConfirm ? (
                  "Delete My Account"
                ) : (
                  "Delete All Data"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
