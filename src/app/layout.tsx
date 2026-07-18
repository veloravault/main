import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { VaultKeyProvider } from "@/components/auth/VaultKeyProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeBootstrap = `
(() => {
  try {
    const stored = localStorage.getItem("theme");
    const preference = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    const resolved = preference === "system"
      ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : preference;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
  } catch {}
})();`;

import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale cap: capping pinch-zoom site-wide to work around iOS's
  // input-focus auto-zoom fails WCAG 1.4.4 (reflow/zoom). Auto-zoom is
  // prevented per-input instead — see the 16px+ font-size rule those inputs
  // carry — so zoom stays available for everyone else.
  viewportFit: "cover",    // Allow content to extend under iPhone notch/home bar
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)",  color: "#000000" },
  ],
};

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://veloravault.in/#organization",
  name: "Velora Vault",
  url: "https://veloravault.in",
  logo: {
    "@type": "ImageObject",
    url: "https://veloravault.in/brand/velora-mark-light.png",
    width: 512,
    height: 512,
  },
  description:
    "A private, encrypted home for passwords, documents, notes and financial essentials.",
};

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://veloravault.in/#website",
  url: "https://veloravault.in",
  name: "Velora Vault",
  publisher: { "@id": "https://veloravault.in/#organization" },
  inLanguage: "en",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://veloravault.in"),
  title: {
    default: "Velora Vault",
    template: "%s — Velora Vault",
  },
  description:
    "A private, encrypted home for passwords, documents, notes and financial essentials.",
  icons: {
    icon: [
      { url: "/brand/velora-favicon-light.png", media: "(prefers-color-scheme: light)", type: "image/png" },
      { url: "/brand/velora-favicon-dark.png", media: "(prefers-color-scheme: dark)", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Velora Vault",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-csp-nonce") ?? undefined;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/*
          A plain inline script, not next/script: it's in <head> so it already
          runs synchronously before hydration, and next/script's
          "beforeInteractive" wrapper re-serializes props into its own
          internal <script> element without forwarding suppressHydrationWarning.
          Browsers also blank a script's nonce attribute once it's inserted into
          the document (so page JS can't read and re-use it) — the initial HTML
          still has the real value the CSP check already passed against, but
          React sees the later empty attribute as a server/client mismatch.
        */}
        <script
          id="velora-theme-bootstrap"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
        <script
          id="velora-jsonld-organization"
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([ORGANIZATION_JSON_LD, WEBSITE_JSON_LD]),
          }}
        />
      </head>
      <body className="antialiased bg-background text-foreground selection:bg-primary/20 min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <VaultKeyProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </VaultKeyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
