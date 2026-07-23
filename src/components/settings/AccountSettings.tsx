"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { CheckIcon, Loader2Icon, PencilIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
import { AdaptiveSheet, AdaptiveSheetBody } from "@/components/ui/adaptive-sheet";
import { PresetAvatar, isAvatarKind, type AvatarKind } from "@/components/PresetAvatar";
import { hintLeaksMasterKey } from "@/lib/masterKeyHint";

type AvatarChoice = AvatarKind | "initials";

const AVATAR_OPTIONS: { key: AvatarChoice; label: string }[] = [
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
  { key: "initials", label: "Initials" },
];

export function AccountSettings({ masterPassword, user }: { masterPassword: string; user: User }) {
  const nameFromUser = (user.user_metadata?.full_name as string | undefined) ?? "";
  const avatarFromUser = isAvatarKind(user.user_metadata?.avatar_kind) ? user.user_metadata.avatar_kind : null;
  const hintFromUser = (user.user_metadata?.master_key_hint as string | undefined) ?? "";

  const [fullName, setFullName] = useState(nameFromUser);
  const [avatarKind, setAvatarKind] = useState<AvatarKind | null>(avatarFromUser);
  const [hint, setHint] = useState(hintFromUser);
  const [saving, setSaving] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState<AvatarChoice | null>(null);
  const [savingHint, setSavingHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hintError, setHintError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [hintSaved, setHintSaved] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const toast = useToast();

  // Settings is a long-lived instance that can be revisited without
  // unmounting, so this picks up name/avatar/hint changes saved elsewhere
  // (e.g. the dashboard greeting's inline rename) - otherwise a stale field
  // here would silently overwrite the newer value on the next Save.
  useEffect(() => { queueMicrotask(() => { setFullName(nameFromUser); setSaved(false); }); }, [nameFromUser]);
  useEffect(() => { queueMicrotask(() => setAvatarKind(avatarFromUser)); }, [avatarFromUser]);
  useEffect(() => { queueMicrotask(() => { setHint(hintFromUser); setHintSaved(false); }); }, [hintFromUser]);

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
    if (nextHint && hintLeaksMasterKey(nextHint, masterPassword)) {
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
    if (next === avatarKind) { setAvatarPickerOpen(false); return; }
    setSavingAvatar(choice);
    const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_kind: next } });
    setSavingAvatar(null);
    if (updateError) {
      toast(updateError.message, "error");
      return;
    }
    setAvatarKind(next);
    setAvatarPickerOpen(false);
    toast("Avatar updated", "success");
  };

  const currentChoice: AvatarChoice = avatarKind ?? "initials";

  return (
    <section className="settings-detail-section account-settings-section" aria-labelledby="settings-account-title">
      <header><p className="type-group-label">Account</p><h2 id="settings-account-title">Your account</h2><p>Manage the identity shown across Velora Vault.</p></header>

      <div className="profile-hero">
        <button type="button" className="profile-hero-avatar-btn" onClick={() => setAvatarPickerOpen(true)} aria-label="Change avatar">
          <span className="settings-avatar is-hero">
            <PresetAvatar kind={avatarKind} name={fullName} email={user.email} />
            <span><PencilIcon aria-hidden="true" /></span>
          </span>
        </button>
        <strong className="profile-hero-name">{fullName || "Your name"}</strong>
        <span className="profile-hero-email" title={user.email}>{user.email}</span>
      </div>

      <div className="profile-fields">
        <div className="profile-field">
          <span className="account-field-label">Full name</span>
          <div className="profile-field-row">
            <input className="account-field-input full-width" value={fullName} onChange={(event) => { setFullName(event.target.value); setSaved(false); }} placeholder="Your name" />
            <Button onClick={saveName} disabled={saving} className="settings-primary-button">
              {saving ? <Loader2Icon className="animate-spin" /> : saved ? <><CheckIcon />Saved</> : "Save"}
            </Button>
          </div>
          {error && <p className="settings-inline-error" role="alert">{error}</p>}
        </div>

        <div className="profile-field">
          <span className="account-field-label">Master key hint</span>
          <p className="profile-field-desc">Shown at unlock to jog your memory - it can never contain the key itself.</p>
          <div className="profile-field-row">
            <input
              className="account-field-input full-width"
              value={hint}
              maxLength={50}
              onChange={(event) => { setHint(event.target.value); setHintSaved(false); }}
              placeholder="e.g. Same as my first apartment"
            />
            <Button onClick={saveHint} disabled={savingHint} className="settings-primary-button">
              {savingHint ? <Loader2Icon className="animate-spin" /> : hintSaved ? <><CheckIcon />Saved</> : "Save"}
            </Button>
          </div>
          {hintError && <p className="settings-inline-error" role="alert">{hintError}</p>}
        </div>
      </div>

      <AdaptiveSheet
        open={avatarPickerOpen}
        onOpenChange={setAvatarPickerOpen}
        title="Choose your avatar"
        description="No photo needed - pick a preset avatar or use your initials."
        size="sm"
      >
        <AdaptiveSheetBody>
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
        </AdaptiveSheetBody>
      </AdaptiveSheet>
    </section>
  );
}
