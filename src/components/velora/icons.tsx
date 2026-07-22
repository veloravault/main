import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function IconTasks(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="m3 6 1.2 1.2L6.5 5M3 12l1.2 1.2L6.5 11M3 18l1.2 1.2L6.5 17" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconTimesheet(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconReports(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}

export function IconInvoice(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21Z" />
      <path d="M10 8h4M10 12h4" />
    </svg>
  );
}

export function IconBudget(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M14.5 9.3c-.6-.8-1.6-1.1-2.5-1.1-1.4 0-2.2.8-2.2 1.8 0 2.4 4.9 1.3 4.9 3.9 0 1.1-.9 1.9-2.4 1.9-1 0-2-.4-2.6-1.2" />
    </svg>
  );
}

export function IconForecast(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 18 9 12l3.5 3.5L20 7" />
      <path d="M20 11V7h-4" />
    </svg>
  );
}

export function IconIntegrations(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10 6a3 3 0 1 1 4 0M10 18a3 3 0 1 0 4 0" />
      <path d="M6 10a3 3 0 1 0 0 4M18 10a3 3 0 1 1 0 4" />
    </svg>
  );
}

export function IconSync(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12a8 8 0 0 1 13.66-5.66L20 8" />
      <path d="M20 4v4h-4" />
      <path d="M20 12a8 8 0 0 1-13.66 5.66L4 16" />
      <path d="M4 20v-4h4" />
    </svg>
  );
}

export function IconPreferences(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconOrganize(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
      <path d="M13 11 20 4M20 4h-4M20 4v4" />
    </svg>
  );
}

// Keys must match the actual pill labels passed in from data.ts
// (PROJECT_PILLS/FINANCE_PILLS) -- these previously carried over unrelated
// keys from the template this file was adapted from, so no pill icon ever
// matched and FeatureSplit rendered every pill with no icon at all.
export const PILL_ICONS = {
  "Saved logins": IconReports,
  "Auto-lock timer": IconClock,
  "Secure notes": IconTimesheet,
  "Password health": IconTasks,
  "Identity files": IconReports,
  "Protected uploads": IconIntegrations,
  "Expiry details": IconClock,
  "Fast search": IconOrganize,
  Cards: IconInvoice,
  "Bank details": IconBudget,
  "Encrypted CVV": IconForecast,
  "Magic import": IconIntegrations,
} as const;

export const CARD_ICONS = {
  sync: IconSync,
  preferences: IconPreferences,
  organize: IconOrganize,
} as const;
