import type { Metadata } from "next";

export const SITE_NAME = "Velora Vault";
export const SITE_URL = "https://veloravault.in";
export const DEFAULT_OG_IMAGE = "/brand/velora-mark-light.png";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
};

/**
 * Shared canonical + Open Graph + Twitter Card metadata for a public page.
 *
 * `title` should be the short, page-specific title (e.g. "Pricing") — the
 * root layout's title template appends "— Velora Vault" for the <title> tag
 * automatically. Social platforms don't see that template (they render
 * `openGraph`/`twitter` verbatim), so this appends the site name there itself.
 */
export function pageMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  type = "website",
  publishedTime,
}: PageMetadataInput): Metadata {
  const url = `${SITE_URL}${path}`;
  const socialTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: image, width: 512, height: 512 }],
      locale: "en_US",
      type,
      ...(type === "article" && publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [image],
    },
  };
}
