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

export function AccountSettings({ masterPassword }: { masterPassword: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarKind, setAvatarKind] = useState<AvatarKind | null>(null);
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState<AvatarChoice | null>(null);
  const [savingHint, setSavingHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hintError, setHintError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [hintSaved, setHintSaved] = useState(false);
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
        setHint((data.user.user_metadata?.master_key_hint as string | undefined) ?? "");
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

  const saveHint = async () => {
    // Same constraints as the hint set during onboarding (OnboardingFlow.tsx):
    // capped length, and it can never contain the actual master key.
    const nextHint = hint.trim();
    if (nextHint.length > 50) {
      setHintError("Keep your master key hint within 50 characters.");
      return;
    }
    if (nextHint && nextHint.toLocaleLowerCase().includes(masterPassword.toLocaleLowerCase())) {
      setHintError("Your hint cannot contain your master key.");
      return;
    }
    setSavingHint(true);
    setHintSaved(false);
    setHintError(null);
    const { error: updateError } = await supabase.auth.updateUser({ data: { master_key_hint: nextHint || null } });
    setSavingHint(false);
    if (updateError) {
      setHintError(updateError.message);
      return;
    }
    setHint(nextHint);
    setHintSaved(true);
    toast("Master key hint saved", "success");
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
      <div className="settings-group">
        <div className="account-profile-header">
          <div className="settings-avatar" aria-hidden="true">
            <PresetAvatar kind={avatarKind} name={fullName} email={user.email} />
          </div>
          <div className="account-identity">
            <strong>{fullName || "Your name"}</strong>
            <span title={user.email}>{user.email}</span>
          </div>
        </div>

        <div className="account-field">
          <label>
            <span className="account-field-label">Full name</span>
            <input className="account-field-input" value={fullName} onChange={(event) => { setFullName(event.target.value); setSaved(false); }} placeholder="Your name" />
          </label>
          {error && <p className="settings-inline-error" role="alert">{error}</p>}
          <div className="settings-form-actions">
            <Button onClick={saveName} disabled={saving} className="settings-primary-button">
              {saving ? <Loader2Icon className="animate-spin" /> : saved ? <><CheckIcon />Saved</> : "Save changes"}
            </Button>
          </div>
        </div>

        <div className="settings-section-head">
          <strong>Avatar</strong>
          <span>Choose how you appear - no photo needed.</span>
        </div>
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

      <div className="settings-group" style={{ marginTop: 20 }}>
        <div className="settings-section-head">
          <strong>Master key hint</strong>
          <span>A reminder shown at unlock - never the key itself.</span>
        </div>
        <div className="account-field">
          <label>
            <span className="account-field-label">Hint</span>
            <input
              className="account-field-input"
              value={hint}
              maxLength={50}
              onChange={(event) => { setHint(event.target.value); setHintSaved(false); }}
              placeholder="e.g. Same as my first apartment"
            />
          </label>
          {hintError && <p className="settings-inline-error" role="alert">{hintError}</p>}
          <div className="settings-form-actions">
            <Button onClick={saveHint} disabled={savingHint} className="settings-primary-button">
              {savingHint ? <Loader2Icon className="animate-spin" /> : hintSaved ? <><CheckIcon />Saved</> : "Save hint"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
