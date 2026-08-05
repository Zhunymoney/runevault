const excludedPrefixes = [
  "/admin",
  "/auth",
  "/checkout",
  "/order-confirmation",
  "/pay",
  "/receipt",
];

export function isTawkAllowedPath(pathname: string) {
  return !excludedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
