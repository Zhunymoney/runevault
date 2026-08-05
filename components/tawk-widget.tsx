"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isTawkAllowedPath } from "@/lib/tawk-routes";

declare global {
  interface Window {
    Tawk_API?: {
      hideWidget?: () => void;
      maximize?: () => void;
      onLoad?: () => void;
      showWidget?: () => void;
    };
  }
}

const widgetSource = `
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/6a72b28124e5411d4460cce0/default';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();`;

export function TawkWidget() {
  const pathname = usePathname();
  const allowed = isTawkAllowedPath(pathname);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (allowed) setRequested(true);

    const updateVisibility = () => {
      if (allowed) window.Tawk_API?.showWidget?.();
      else window.Tawk_API?.hideWidget?.();
    };

    const api = (window.Tawk_API ??= {});
    updateVisibility();
    if (!api.hideWidget) {
      api.onLoad = updateVisibility;
    }
  }, [allowed]);

  if (!requested) return null;

  return (
    <Script id="runevault-tawk-widget" strategy="afterInteractive">
      {widgetSource}
    </Script>
  );
}
