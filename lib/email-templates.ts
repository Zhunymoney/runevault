const definitions = {
  account_verification: ["Verify your RuneVault account", "Confirm your email to activate your RuneVault account."],
  password_reset: ["Reset your RuneVault password", "Use the secure link below to choose a new password."],
  welcome: ["Welcome to RuneVault", "Your RuneVault account is active."],
  order_confirmation: ["Order received", "RuneVault received your order and created a private tracking reference."],
  payment_instructions: ["Payment instructions", "Use only the payment details shown below for this order."],
  crypto_submitted: ["Payment submitted for review", "Your transaction was submitted for manual verification."],
  crypto_received: ["Payment confirmed", "Your crypto payment has been verified."],
  card_confirmed: ["Payment confirmed", "Your card payment has been confirmed."],
  order_approved: ["Order processing", "Your order is moving through the RuneVault fulfillment workflow."],
  order_rejected: ["Order requires attention", "Your order needs staff review. Open tracking or contact support for details."],
  order_cancelled: ["Order cancelled", "Your RuneVault order has been cancelled."],
  refund_issued: ["Refund recorded", "A refund was recorded for your RuneVault order."],
  delivery_started: ["Order processing", "Your OSRS gold order is now in progress."],
  order_completed: ["Order completed", "Your RuneVault order is complete."],
  support_received: ["Support request received", "RuneVault support received your request."],
  support_reply: ["New support reply", "A RuneVault team member replied to your support request."],
  offline_message: ["Offline message received", "Your message is waiting for RuneVault support."],
  security_alert: ["RuneVault security alert", "A security-related event was recorded on your account."],
  admin_new_order: ["New RuneVault order", "A new customer order requires operational review."],
  admin_payment_submitted: ["Manual payment review submitted", "A customer submitted a crypto transaction for review."],
  admin_payment_confirmed: ["Payment confirmed", "A RuneVault payment was confirmed."],
  admin_large_order: ["Large transaction alert", "A transaction exceeded the configured large-order threshold."],
  admin_high_risk: ["High-risk transaction alert", "An order reached RuneVault’s existing high-risk classification."],
  admin_payment_error: ["Payment intervention required", "A payment event requires manual operational review."],
} as const;

export type EmailTemplateName = keyof typeof definitions;
export type TemplateInput = {
  reference?: string;
  actionUrl?: string;
  actionLabel?: string;
  detail?: string;
  recipientName?: string;
  status?: string;
  summary?: Array<{ label: string; value: string }> | Record<string, string>;
};

export function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function safeActionUrl(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? escapeHtml(url.toString()) : "";
  } catch { return ""; }
}

export function emailTemplate(name: EmailTemplateName, input: TemplateInput = {}) {
  const [baseSubject, introduction] = definitions[name];
  const reference = input.reference?.trim() ?? "";
  const subject = reference ? `${baseSubject} — ${reference}` : baseSubject;
  const actionUrl = safeActionUrl(input.actionUrl);
  const actionLabel = input.actionLabel?.trim() || "Open RuneVault";
  const greeting = input.recipientName?.trim() ? `Hi ${input.recipientName.trim()},` : "Hello,";
  const summary = (Array.isArray(input.summary) ? input.summary : Object.entries(input.summary ?? {}).map(([label, value]) => ({ label, value }))).filter((item) => item.label && item.value);
  const textRows = summary.map((item) => `${item.label}: ${item.value}`);
  const text = [greeting, introduction, reference ? `Order reference: ${reference}` : "", input.status ? `Status: ${input.status}` : "", ...textRows, input.detail, input.actionUrl, "Never share your password, authentication codes, wallet private keys, or seed phrases."].filter(Boolean).join("\n\n");
  const summaryHtml = summary.length ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0">${summary.map((item) => `<tr><td style="padding:10px 0;color:#858b98;border-bottom:1px solid #262a33">${escapeHtml(item.label)}</td><td style="padding:10px 0;text-align:right;font-weight:700;border-bottom:1px solid #262a33">${escapeHtml(item.value)}</td></tr>`).join("")}</table>` : "";
  return {
    subject,
    text,
    html: `<!doctype html><html><body style="margin:0;background:#07090d;color:#f7f3e8;font-family:Arial,sans-serif"><div style="max-width:640px;margin:auto;padding:32px 20px"><a href="${safeActionUrl(process.env.NEXT_PUBLIC_SITE_URL || "https://runevault-beta.vercel.app")}" style="color:#fbbf24;font-size:24px;font-weight:900;text-decoration:none">RuneVault</a><div style="margin-top:24px;border:1px solid #2b2d33;border-radius:20px;background:#0d1016;padding:30px"><p style="margin:0 0 12px;color:#b8bbc3">${escapeHtml(greeting)}</p><h1 style="margin:0 0 14px;font-size:28px;line-height:1.2">${escapeHtml(baseSubject)}</h1><p style="color:#b8bbc3;line-height:1.7">${escapeHtml(introduction)}</p>${reference ? `<p style="padding:13px;border-radius:10px;background:#151923"><strong>Order reference:</strong> ${escapeHtml(reference)}</p>` : ""}${input.status ? `<p style="display:inline-block;padding:7px 11px;border-radius:999px;background:#3b2d0a;color:#fde68a;font-size:12px;font-weight:800;text-transform:uppercase">${escapeHtml(input.status)}</p>` : ""}${summaryHtml}${input.detail ? `<p style="color:#b8bbc3;line-height:1.7">${escapeHtml(input.detail)}</p>` : ""}${actionUrl ? `<p style="margin-top:24px"><a href="${actionUrl}" style="display:inline-block;padding:13px 19px;border-radius:11px;background:#fbbf24;color:#111827;font-weight:900;text-decoration:none">${escapeHtml(actionLabel)}</a></p>` : ""}</div><p style="color:#777d89;font-size:12px;line-height:1.7">This email was sent because of activity on your RuneVault account or an order managed by RuneVault. Never share passwords, authentication codes, wallet private keys, or seed phrases. Visit RuneVault support if you need help.</p></div></body></html>`,
  };
}
