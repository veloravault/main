import type { Variants } from "framer-motion";

export type OnboardingStepId = "vault" | "security" | "avatar" | "master-key" | "done";

export const ONBOARDING_STEPS: readonly OnboardingStepId[] = [
  "vault", "security", "avatar", "master-key", "done",
];

export const FIRST_INTERACTIVE_INDEX = ONBOARDING_STEPS.indexOf("avatar");

export const STEP_HEADINGS: Record<OnboardingStepId, { eyebrow: string; title: string; description: string }> = {
  "vault": {
    eyebrow: "Welcome to Velora",
    title: "Everything worth protecting, in one vault.",
    description: "Passwords and important documents live together — encrypted end to end, readable only by you.",
  },
  "security": {
    eyebrow: "Zero-knowledge",
    title: "Only you can open your vault.",
    description: "Your master key decrypts your vault in this browser alone. We never receive it, store it, or have any way to recover it.",
  },
  "avatar": {
    eyebrow: "Make it yours",
    title: "Pick a profile look.",
    description: "Choose an avatar now, or skip and we'll use your initials.",
  },
  "master-key": {
    eyebrow: "Last step",
    title: "Set your master key.",
    description: "This is the key that unlocks your vault. Choose something strong you won't forget.",
  },
  "done": {
    eyebrow: "All set",
    title: "Your vault is ready.",
    description: "Taking you in…",
  },
};

export const INTRO_CONTENT: Record<"vault" | "security", { icon: "vault" | "shield"; bullets: string[] }> = {
  "vault": {
    icon: "vault",
    bullets: [
      "Logins, cards, and secure notes in one place",
      "Attach and store important documents",
      "Encrypted end to end — even from us",
    ],
  },
  "security": {
    icon: "shield",
    bullets: [
      "Your master key never leaves this browser",
      "Not sent, not stored, not logged",
      "If you lose it, no one — including us — can recover your vault",
    ],
  },
};

// Directional slide+fade. `custom` is the direction: 1 = forward, -1 = back.
// Under reduced motion we collapse to opacity only.
export function stepVariants(reduceMotion: boolean): Variants {
  if (reduceMotion) {
    return {
      enter: { opacity: 0 },
      center: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }
  return {
    enter: (direction: number) => ({ opacity: 0, x: direction * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (direction: number) => ({ opacity: 0, x: -direction * 40 }),
  };
}
