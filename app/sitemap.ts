import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://runevault-beta.vercel.app";

  const routes = [
    "",
    "/quote",
    "/orders",
    "/auth",
    "/support",
    "/osrs", "/marketplace", "/news", "/guides", "/learn",
    "/privacy",
    "/terms",
    "/refund-policy", "/cancellation-policy", "/delivery-policy", "/cookie-policy", "/acceptable-use", "/fraud-prevention",
    "/health",
  ];

  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/quote" ? 0.9 : 0.6,
  }));
}
