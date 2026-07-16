import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  maximumScale: 1,         // Prevent auto-zoom on input focus (iOS)
  viewportFit: "cover",    // Allow content to extend under iPhone notch/home bar
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)",  color: "#000000" },
  ],
};

export const metadata: Metadata = {
  title: "Velora Vault",
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
        <Script id="velora-theme-bootstrap" strategy="beforeInteractive" nonce={nonce}>
          {themeBootstrap}
        </Script>
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
