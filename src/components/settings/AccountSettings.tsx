"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { CameraIcon, CheckIcon, Loader2Icon, UserIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { useToast } from "@/components/Toast";

const ACCEPTED_AVATARS = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function AccountSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      if (authError || !data.user) {
        setError(authError?.message ?? "Your account could not be loaded.");
      } else {
        setUser(data.user);
        setFullName((data.user.user_metadata?.full_name as string | undefined) ?? "");
        setAvatarUrl((data.user.user_metadata?.avatar_url as string | undefined) ?? null);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const saveName = async () => {
    const nextName = fullName.trim();
    if (!nextName) {
      setError("Enter your full name before saving.");
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ data: { full_name: nextName } });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setFullName(nextName);
    setSaved(true);
    toast("Account details saved", "success");
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;
    if (!ACCEPTED_AVATARS.has(file.type)) {
      setError("Choose a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Profile photos must be smaller than 5 MB.");
      return;
    }

    setUploading(true);
    setError(null);
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const storagePath = `${user.id}/avatar-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(storagePath, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(storagePath);
    const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: data.publicUrl } });
    setUploading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setAvatarUrl(data.publicUrl);
    toast("Profile photo updated", "success");
  };

  if (loading) return <div className="settings-account-skeleton" aria-label="Loading account settings" />;
  if (!user) return <StateView kind="error" title="Account unavailable" description={error ?? "Sign in again to load your account."} />;

  return (
    <section className="settings-detail-section" aria-labelledby="settings-account-title">
      <header><p className="type-group-label">Account</p><h2 id="settings-account-title">Your account</h2><p>Manage the identity shown across Velora Vault.</p></header>
      <div className="settings-group settings-account-card">
        <div className="settings-avatar-column">
          <button type="button" className="settings-avatar system-interactive" onClick={() => fileInputRef.current?.click()} aria-label="Change profile photo" disabled={uploading}>
            {avatarUrl ? <img src={avatarUrl} alt="Profile" /> : <UserIcon aria-hidden="true" />}
            <span><CameraIcon aria-hidden="true" /></span>
            {uploading && <i><Loader2Icon className="animate-spin" aria-hidden="true" /></i>}
          </button>
          <button type="button" className="settings-photo-link" onClick={() => fileInputRef.current?.click()} disabled={uploading}>Edit photo</button>
          <input ref={fileInputRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} />
        </div>
        <div className="settings-account-fields">
          <div className="settings-value-row"><span>Email</span><strong title={user.email}>{user.email}</strong></div>
          <label className="settings-value-row"><span>Full name</span><input value={fullName} onChange={(event) => { setFullName(event.target.value); setSaved(false); }} placeholder="Your name" /></label>
          {error && <p className="settings-inline-error" role="alert">{error}</p>}
          <div className="settings-form-actions">
            <Button onClick={saveName} disabled={saving || uploading} className="settings-primary-button">
              {saving ? <Loader2Icon className="animate-spin" /> : saved ? <><CheckIcon />Saved</> : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
