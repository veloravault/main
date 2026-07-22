import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/components/dreelio/blog-data";

const BASE_URL = "https://veloravault.in";

// Real "last meaningfully edited" dates - bump by hand when a page's content
// actually changes. Don't swap for `new Date()`: a sitemap where every
// lastmod is today's build timestamp stops being a freshness signal.
const LAST_MODIFIED = {
  home: "2026-07-17",
  pricing: "2026-07-17",
  security: "2026-07-17",
  contact: "2026-07-18",
  blogIndex: "2026-07-17",
  privacy: "2026-07-17", // matches "Last updated: July 17, 2026" on the page
  terms: "2026-07-17", // matches "Last updated: July 17, 2026" on the page
  login: "2026-07-17",
  signup: "2026-07-17",
  passwordManager: "2026-07-22",
  howItWorks: "2026-07-22",
  secureDocuments: "2026-07-22",
  digitalWallet: "2026-07-22",
  magicImport: "2026-07-22",
  help: "2026-07-22",
} as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: LAST_MODIFIED.home, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/pricing`, lastModified: LAST_MODIFIED.pricing, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/security`, lastModified: LAST_MODIFIED.security, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/password-manager`, lastModified: LAST_MODIFIED.passwordManager, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/how-it-works`, lastModified: LAST_MODIFIED.howItWorks, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/features/secure-documents`, lastModified: LAST_MODIFIED.secureDocuments, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/features/digital-wallet`, lastModified: LAST_MODIFIED.digitalWallet, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/features/magic-import`, lastModified: LAST_MODIFIED.magicImport, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/help`, lastModified: LAST_MODIFIED.help, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/blog`, lastModified: LAST_MODIFIED.blogIndex, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/contact`, lastModified: LAST_MODIFIED.contact, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/login`, lastModified: LAST_MODIFIED.login, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/signup`, lastModified: LAST_MODIFIED.signup, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/privacy`, lastModified: LAST_MODIFIED.privacy, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: LAST_MODIFIED.terms, changeFrequency: "yearly", priority: 0.3 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.date,
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...blogRoutes];
}
