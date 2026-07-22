import type { Metadata } from "next";
import { headers } from "next/headers";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { PricingPageContent } from "@/components/velora/PricingPageContent";
import { PRICING_FAQ } from "@/components/velora/pricing-data";
import { getInitialSignedIn } from "@/lib/server/auth";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "Free and Plus plans for Velora Vault. Start free, no credit card required.",
  path: "/pricing",
});

// GEO/AI-citation value only: Google restricted FAQ rich results to
// government/health sites in 2023, so this won't produce a Google rich
// result on a commercial page like this one.
const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: PRICING_FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default async function PricingPage() {
  const [nonce, initialSignedIn] = await Promise.all([
    headers().then((h) => h.get("x-csp-nonce") ?? undefined),
    getInitialSignedIn(),
  ]);

  return (
    <PublicPageShell>
      {/* suppressHydrationWarning: the browser blanks a script's nonce
          attribute once inserted (so page JS can't read/reuse it) - see the
          fuller explanation on the JSON-LD script in src/app/layout.tsx. */}
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <PricingPageContent initialSignedIn={initialSignedIn} />
    </PublicPageShell>
  );
}
