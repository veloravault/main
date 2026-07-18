import type { MetadataRoute } from "next";

const BASE_URL = "https://veloravault.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/vault",
        "/admin",
        "/onboarding",
        "/api/",
        "/auth/",
        "/request-access",
        "/reset-password",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
