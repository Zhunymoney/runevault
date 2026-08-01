type TemplateInput = { reference?: string; actionUrl?: string; detail?: string };

const labels = {
  account_verification: ["Verify your RuneVault account", "Confirm your email to activate your RuneVault account."],
  password_reset: ["Reset your RuneVault password", "Use the secure link below to choose a new password."],
  order_confirmation: ["RuneVault order confirmed", "We received your order and created a private tracking reference."],
  crypto_submitted: ["Crypto payment submitted", "Your transaction was submitted for manual verification."],
  crypto_received: ["Crypto payment received", "Your crypto payment has been verified."],
  card_confirmed: ["Card payment confirmed", "Your card payment has been confirmed."],
  order_approved: ["Order approved", "Your order has been approved for fulfillment."],
  order_rejected: ["Order requires attention", "Your order was rejected. Review the details or contact support."],
  order_cancelled: ["Order cancelled", "Your RuneVault order has been cancelled."],
  refund_issued: ["Refund issued", "A refund has been issued for your order."],
  delivery_started: ["Delivery started", "Your OSRS gold delivery is now in progress."],
  order_completed: ["Order completed", "Your RuneVault order is complete."],
  support_received: ["Support request received", "Our support team received your request."],
  support_reply: ["New support reply", "A RuneVault team member replied to your support request."],
  offline_message: ["Offline message received", "Your message was received and is waiting for support."],
  security_alert: ["RuneVault security alert", "We detected a security-related account event."],
} as const;

export type EmailTemplateName = keyof typeof labels;

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export function emailTemplate(name: EmailTemplateName, input: TemplateInput = {}) {
  const [subject, introduction] = labels[name];
  const reference = input.reference ? escapeHtml(input.reference) : "";
  const detail = input.detail ? escapeHtml(input.detail) : "";
  const actionUrl = input.actionUrl ? escapeHtml(input.actionUrl) : "";
  const referenceLine = reference ? `Order reference: ${reference}` : "";
  return {
    subject: reference ? `${subject} — ${reference}` : subject,
    text: [introduction, referenceLine, input.detail, input.actionUrl].filter(Boolean).join("\n\n"),
    html: `<!doctype html><html><body style="margin:0;background:#07090d;color:#f6f2e8;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;padding:32px 20px"><div style="color:#fbbf24;font-size:22px;font-weight:800">RuneVault</div><div style="margin-top:24px;border:1px solid #2b2d33;border-radius:18px;background:#0d1016;padding:28px"><h1 style="margin:0 0 16px;font-size:28px">${escapeHtml(subject)}</h1><p style="color:#b8bbc3;line-height:1.7">${escapeHtml(introduction)}</p>${reference ? `<p style="padding:12px;border-radius:10px;background:#151923"><strong>Order reference:</strong> ${reference}</p>` : ""}${detail ? `<p style="color:#b8bbc3;line-height:1.7">${detail}</p>` : ""}${actionUrl ? `<p><a href="${actionUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#fbbf24;color:#111827;font-weight:800;text-decoration:none">Open RuneVault</a></p>` : ""}</div><p style="color:#747985;font-size:12px;line-height:1.6">Never share passwords or authentication codes. If you did not request this message, contact RuneVault support.</p></div></body></html>`,
  };
}
