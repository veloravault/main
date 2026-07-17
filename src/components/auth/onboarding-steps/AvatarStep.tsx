"use client";

import { PresetAvatar, type AvatarKind } from "@/components/PresetAvatar";
import shell from "@/components/auth/auth-shell.module.css";

export function AvatarStep({
  selected,
  onSelect,
}: {
  selected: AvatarKind | null;
  onSelect: (kind: AvatarKind | null) => void;
}) {
  return (
    <div className={shell.avatarChoiceGrid}>
      {(["male", "female"] as const).map((kind) => (
        <button
          key={kind}
          type="button"
          className={shell.avatarChoice}
          aria-pressed={selected === kind}
          onClick={() => (selected === kind ? onSelect(null) : onSelect(kind))}
        >
          <span className={shell.avatarChoicePreview}><PresetAvatar kind={kind} /></span>
          {kind === "male" ? "Male" : "Female"}
        </button>
      ))}
    </div>
  );
}
