import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' https://dash.accessibly.app https://*.accessibly.app${
    isProduction ? "" : " 'unsafe-eval'"
  }`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self' https://*.accessibly.app",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  /* Both this app and Horizon are Next apps behind one domain, so both would
     serve their bundles from /_next. Horizon keeps the bare path (it is
     deployed unmodified); this app moves its own bundles under /home-assets,
     which nginx strips before proxying back here. Dev is left alone so HMR
     keeps working. */
  assetPrefix: process.env.NODE_ENV === "production" ? "/home-assets" : undefined,

  /* Let `next dev` serve /_next/* to pages opened over the LAN IP, not
     just localhost — otherwise the HTML loads but every chunk/HMR
     request is blocked as cross-origin and the page hangs on the
     loader. Next matches these as dot-separated segments with a single
     `*` wildcard per segment (NOT CIDR), so "192.168.1.*" covers every
     device on that subnet. Add other subnets if you switch networks. */
  allowedDevOrigins: ["192.168.1.*", "192.168.0.*"],

  headers: async () => [
    {
      source: "/:path*",
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;
