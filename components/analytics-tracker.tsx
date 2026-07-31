"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

function RouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    trackEvent("page_view", {
      path: query ? `${pathname}?${query}` : pathname,
    });

    const ga = window as Window & {
      gtag?: (...args: unknown[]) => void;
    };

    ga.gtag?.("event", "page_view", {
      page_path: query ? `${pathname}?${query}` : pathname,
    });
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsTracker() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <>
      {measurementId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            strategy="afterInteractive"
          />
          <Script id="runevault-google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${measurementId}', { send_page_view: false });
            `}
          </Script>
        </>
      )}
      <Suspense fallback={null}>
        <RouteTracker />
      </Suspense>
    </>
  );
}
