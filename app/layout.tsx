import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./launch-pack.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { ChatWidget } from "@/components/chat-widget";
import { JsonLd } from "@/components/structured-data";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://runevault-beta.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RuneVault — Buy & Sell OSRS Gold",
    template: "%s | RuneVault",
  },
  description:
    "RuneVault is an OSRS marketplace platform with quotes, customer accounts, tracked orders, receipts, pricing, inventory, and admin operations.",
  applicationName: "RuneVault",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "RuneVault",
    title: "RuneVault — OSRS Gold Marketplace",
    description:
      "Create OSRS gold quotes, track orders, and manage marketplace operations.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RuneVault — OSRS Gold Marketplace",
    description:
      "Create OSRS gold quotes, track orders, and manage marketplace operations.",
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
        <JsonLd data={[{"@context":"https://schema.org","@type":"Organization",name:"RuneVault",url:siteUrl},{"@context":"https://schema.org","@type":"WebSite",name:"RuneVault",url:siteUrl,potentialAction:{"@type":"SearchAction",target:`${siteUrl}/learn?q={search_term_string}`,"query-input":"required name=search_term_string"}}]} />
        <AnalyticsTracker />
        <SiteHeader />
        {children}
        <SiteFooter />
        <ChatWidget externalProvider={process.env.NEXT_PUBLIC_CHAT_PROVIDER} externalUrl={process.env.NEXT_PUBLIC_CHAT_PROVIDER_URL} />
      </body>
    </html>
  );
}
