import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.veloravault.in" }],
        destination: "https://veloravault.in/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "veloravault.vercel.app" }],
        destination: "https://veloravault.in/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      new URL("https://assets.nflxext.com/us/ffe/siteui/common/icons/**"),
      new URL("https://storage.googleapis.com/pr-newsroom-wp/**"),
      new URL("https://www.amazon.com/favicon.ico"),
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    const sensitiveAuthHeaders = [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "no-store" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
      { source: "/confirm-signup", headers: sensitiveAuthHeaders },
      { source: "/auth/confirm-signup", headers: sensitiveAuthHeaders },
    ];
  },
};

export default nextConfig;
