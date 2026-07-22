import type { Metadata } from "next";
import { headers } from "next/headers";
import { PublicPageShell } from "@/components/velora/PublicPageShell";
import { FAQ_CATEGORIES, FaqPageContent } from "@/components/velora/faq/FaqPageContent";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "FAQ",
  description:
    "Answers to the most common questions about Velora Vault - encryption, pricing, data privacy, and account support.",
  path: "/faq",
});

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_CATEGORIES.flatMap((category) =>
    category.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  ),
};

export default async function FaqPage() {
  const nonce = (await headers()).get("x-csp-nonce") ?? undefined;

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
      <FaqPageContent />
    </PublicPageShell>
  );
}
