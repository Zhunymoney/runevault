import type { NextConfig } from "next";

const scriptPolicy = process.env.NODE_ENV === "production"
  ? "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://*.tawk.to https://cdn.jsdelivr.net"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://*.tawk.to https://cdn.jsdelivr.net";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self' https://*.tawk.to",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://*.tawk.to https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://*.tawk.to https://fonts.googleapis.com https://cdn.jsdelivr.net",
      scriptPolicy,
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://*.tawk.to wss://*.tawk.to",
      "frame-src https://*.tawk.to",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
