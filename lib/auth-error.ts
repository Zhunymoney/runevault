type AuthErrorLike = {
  message?: unknown;
  msg?: unknown;
  error_description?: unknown;
  error?: unknown;
};

function readable(value: unknown) {
  return typeof value === "string" && value.trim() && value.trim() !== "{}"
    ? value.trim()
    : null;
}

export function authErrorMessage(reason: unknown) {
  if (reason instanceof Error) return readable(reason.message) ?? "Authentication failed. Please try again.";
  if (typeof reason === "string") return readable(reason) ?? "Authentication failed. Please try again.";
  if (reason && typeof reason === "object") {
    const candidate = reason as AuthErrorLike;
    return readable(candidate.message)
      ?? readable(candidate.msg)
      ?? readable(candidate.error_description)
      ?? readable(candidate.error)
      ?? "Authentication failed. Please try again.";
  }
  return "Authentication failed. Please try again.";
}
