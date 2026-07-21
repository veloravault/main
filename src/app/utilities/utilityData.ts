export const UTILITIES = [
  {
    slug: "password-generator",
    label: "Password generator",
    href: "/utilities/password-generator",
    description: "Create a strong random password.",
  },
  {
    slug: "passphrase-generator",
    label: "Passphrase generator",
    href: "/utilities/passphrase-generator",
    description: "Build a memorable multi-word secret.",
  },
  {
    slug: "username-generator",
    label: "Username generator",
    href: "/utilities/username-generator",
    description: "Create a private online identity.",
  },
  {
    slug: "password-strength",
    label: "Password strength tester",
    href: "/utilities/password-strength",
    description: "Check a password locally.",
  },
] as const;

export type UtilitySlug = (typeof UTILITIES)[number]["slug"];

export function relatedUtilities(currentSlug: UtilitySlug) {
  return UTILITIES.filter((utility) => utility.slug !== currentSlug);
}
