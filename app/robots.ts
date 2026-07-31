import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://runevault-beta.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/quote", "/orders", "/support", "/privacy", "/terms"],
        disallow: ["/admin", "/account", "/checkout", "/order-confirmation"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
