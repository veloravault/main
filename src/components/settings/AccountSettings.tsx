"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { useToast } from "@/components/Toast";
import { PresetAvatar, isAvatarKind, type AvatarKind } from "@/components/PresetAvatar";

type AvatarChoice = AvatarKind | "initials";

const AVATAR_OPTIONS: { key: AvatarChoice; label: string }[] = [
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
  { key: "initials", label: "Initials" },
];

export function AccountSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarKind, setAvatarKind] = useState<AvatarKind | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState<AvatarChoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
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
        setAvatarKind(isAvatarKind(data.user.user_metadata?.avatar_kind) ? data.user.user_metadata.avatar_kind : null);
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

  const chooseAvatar = async (choice: AvatarChoice) => {
    const next = choice === "initials" ? null : choice;
    if (next === avatarKind) return;
    setSavingAvatar(choice);
    const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_kind: next } });
    setSavingAvatar(null);
    if (updateError) {
      toast(updateError.message, "error");
      return;
    }
    setAvatarKind(next);
    toast("Avatar updated", "success");
  };

  if (loading) return <div className="settings-account-skeleton" aria-label="Loading account settings" />;
  if (!user) return <StateView kind="error" title="Account unavailable" description={error ?? "Sign in again to load your account."} />;

  const currentChoice: AvatarChoice = avatarKind ?? "initials";

  return (
    <section className="settings-detail-section" aria-labelledby="settings-account-title">
      <header><p className="type-group-label">Account</p><h2 id="settings-account-title">Your account</h2><p>Manage the identity shown across Velora Vault.</p></header>
      <div className="settings-group settings-account-card">
        <div className="settings-avatar-column">
          <div className="settings-avatar" aria-hidden="true">
            <PresetAvatar kind={avatarKind} name={fullName} email={user.email} />
          </div>
        </div>
        <div className="settings-account-fields">
          <div className="settings-value-row"><span>Email</span><strong title={user.email}>{user.email}</strong></div>
          <label className="settings-value-row"><span>Full name</span><input value={fullName} onChange={(event) => { setFullName(event.target.value); setSaved(false); }} placeholder="Your name" /></label>
          {error && <p className="settings-inline-error" role="alert">{error}</p>}
          <div className="settings-form-actions">
            <Button onClick={saveName} disabled={saving} className="settings-primary-button">
              {saving ? <Loader2Icon className="animate-spin" /> : saved ? <><CheckIcon />Saved</> : "Save changes"}
            </Button>
          </div>
        </div>
      </div>

      <div className="settings-group settings-avatar-picker-group">
        <div className="settings-value-row settings-avatar-picker-head"><span>Avatar</span><strong>Choose how you appear — no photo needed.</strong></div>
        <div className="settings-avatar-picker" role="radiogroup" aria-label="Avatar style">
          {AVATAR_OPTIONS.map((option) => {
            const active = currentChoice === option.key;
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={active}
                className={`settings-avatar-option system-interactive ${active ? "is-active" : ""}`}
                onClick={() => chooseAvatar(option.key)}
                disabled={savingAvatar !== null}
              >
                <span className="settings-avatar-option-preview">
                  <PresetAvatar kind={option.key === "initials" ? null : option.key} name={fullName} email={user.email} />
                </span>
                <span className="settings-avatar-option-label">
                  {option.label}
                  {savingAvatar === option.key ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : active ? <CheckIcon aria-hidden="true" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
