// Profile avatars without any file storage. Users pick "male" or "female"
// (stored in Supabase user_metadata.avatar_kind); anyone who hasn't chosen gets
// a deterministic colored-initials circle. Everything is inline SVG - no
// uploads, no buckets, no external requests.

export type AvatarKind = "male" | "female";

export function isAvatarKind(value: unknown): value is AvatarKind {
  return value === "male" || value === "female";
}

const INITIALS_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
];

function initialsFor(name?: string | null, email?: string | null): string {
  const source = (name ?? "").trim();
  if (source) {
    const parts = source.split(/\s+/);
    const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
    return initials || source[0]!.toUpperCase();
  }
  return (email?.[0] ?? "U").toUpperCase();
}

function colorFor(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return INITIALS_COLORS[hash % INITIALS_COLORS.length];
}

interface PresetAvatarProps {
  kind?: AvatarKind | null;
  name?: string | null;
  email?: string | null;
  className?: string;
  title?: string;
}

/** Fills its parent (width/height 100%); parent controls the size. */
export function PresetAvatar({ kind, name, email, className, title }: PresetAvatarProps) {
  const label = title ?? name ?? "Profile avatar";
  const common = { className, width: "100%", height: "100%", viewBox: "0 0 100 100", role: "img" as const, "aria-label": label };

  if (kind === "male") {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="50" fill="#3b6fe0" />
        <circle cx="50" cy="38" r="14" fill="#ffffff" />
        <path fill="#ffffff" d="M32 84 L32 70 C32 60 40 54 50 54 C60 54 68 60 68 70 L68 84 Z" />
      </svg>
    );
  }

  if (kind === "female") {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="50" fill="#e0559e" />
        <circle cx="50" cy="38" r="14" fill="#ffffff" />
        <path fill="#ffffff" d="M50 54 C42 54 36 59 33 70 L28 84 L72 84 L67 70 C64 59 58 54 50 54 Z" />
      </svg>
    );
  }

  const initials = initialsFor(name, email);
  return (
    <svg {...common}>
      <circle cx="50" cy="50" r="50" fill={colorFor(name || email || "U")} />
      <text x="50" y="50" dy="0.35em" textAnchor="middle" fontSize="40" fontWeight="600" fill="#ffffff" fontFamily="system-ui, -apple-system, sans-serif">
        {initials}
      </text>
    </svg>
  );
}
