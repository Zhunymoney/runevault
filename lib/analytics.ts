export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

export function trackEvent(
  name: string,
  properties: AnalyticsProperties = {},
) {
  if (typeof window === "undefined") return;

  const record = {
    name,
    properties,
    occurred_at: new Date().toISOString(),
  };

  try {
    const existing = JSON.parse(
      window.localStorage.getItem("runevault_analytics") ?? "[]",
    ) as unknown[];

    window.localStorage.setItem(
      "runevault_analytics",
      JSON.stringify([...existing.slice(-199), record]),
    );
  } catch {
    // Analytics must never block checkout or tracking.
  }

  const ga = window as Window & {
    gtag?: (...args: unknown[]) => void;
  };

  ga.gtag?.("event", name, properties);
}
