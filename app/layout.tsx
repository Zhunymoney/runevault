import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AnalyticsTracker } from "@/components/analytics-tracker";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://runevault-beta.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RuneVault — Buy & Sell OSRS Gold",
    template: "%s | RuneVault",
  },
  description:
    "RuneVault is a test-mode OSRS gold marketplace platform with quotes, customer accounts, tracked orders, receipts, pricing, inventory, and admin operations.",
  applicationName: "RuneVault",
  alternates: { canonical: "/" },
  keywords: [
    "RuneVault",
    "OSRS gold",
    "Old School RuneScape marketplace",
    "OSRS order tracking",
  ],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "RuneVault",
    title: "RuneVault — OSRS Gold Marketplace",
    description:
      "Create OSRS gold quotes, track preview orders, and manage marketplace operations.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RuneVault — OSRS Gold Marketplace",
    description:
      "Create OSRS gold quotes, track preview orders, and manage marketplace operations.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#07090d",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AnalyticsTracker />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
