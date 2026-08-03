import { emailTemplate, type EmailTemplateName, type TemplateInput } from "@/lib/email-templates";
import { getUserEmail, sendEmail, serviceHeaders, supabaseUrl } from "@/lib/launch-server";

export const MAX_EMAIL_ATTEMPTS = 3;

export type EmailEventType =
  | "welcome"
  | "order_received"
  | "payment_instructions"
  | "payment_submitted"
  | "payment_confirmed"
  | "order_processing"
  | "order_completed"
  | "order_cancelled"
  | "order_refunded"
  | "admin_new_order"
  | "admin_payment_submitted"
  | "admin_payment_confirmed"
  | "admin_large_order"
  | "admin_high_risk"
  | "admin_payment_error";

export type EmailEventPayload = {
  template: EmailTemplateName;
  input: TemplateInput;
};

type SendEvent = {
  eventKey: string;
  eventType: EmailEventType;
  recipient?: string | null;
  orderId?: string | null;
  userId?: string | null;
  payload: EmailEventPayload;
};

type LedgerRow = {
  id: string;
  event_key: string;
  event_type: EmailEventType;
  recipient: string | null;
  order_id: string | null;
  user_id: string | null;
  status: string;
  attempts: number;
  payload: EmailEventPayload;
};

const cleanEmail = (value?: string | null) => value?.trim().toLowerCase() || null;

async function updateLedger(id: string, values: Record<string, unknown>) {
  const response = await fetch(`${supabaseUrl()}/rest/v1/notification_events?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...serviceHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({ ...values, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) console.error(`Email ledger update failed (${response.status}).`);
}

async function deliver(row: LedgerRow) {
  if (!row.recipient) {
    await updateLedger(row.id, { status: "skipped", error_message: "Recipient unavailable", last_attempt_at: new Date().toISOString() });
    return { sent: false as const, reason: "missing_recipient" as const };
  }
  const template = emailTemplate(row.payload.template, row.payload.input);
  const result = await sendEmail({ to: row.recipient, ...template, idempotencyKey: row.event_key });
  const now = new Date().toISOString();
  if (result.sent) {
    await updateLedger(row.id, { status: "sent", provider_id: result.id, error_message: null, sent_at: now, last_attempt_at: now });
  } else {
    await updateLedger(row.id, { status: result.reason === "development_preview" ? "skipped" : "failed", error_message: result.reason, last_attempt_at: now });
  }
  return result;
}

export async function sendEmailEvent(event: SendEvent) {
  try {
  const recipient = cleanEmail(event.recipient);
  const response = await fetch(`${supabaseUrl()}/rest/v1/notification_events?on_conflict=event_key`, {
    method: "POST",
    headers: { ...serviceHeaders(), Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify({
      event_key: event.eventKey,
      event_type: event.eventType,
      channel: "email",
      status: "pending",
      attempts: 1,
      recipient,
      order_id: event.orderId ?? null,
      user_id: event.userId ?? null,
      payload: event.payload,
      last_attempt_at: new Date().toISOString(),
    }),
  });
  const rows = response.ok ? await response.json().catch(() => []) as LedgerRow[] : [];
  if (!response.ok) {
    console.error(`Email event claim failed (${response.status}) for ${event.eventType}.`);
    return { sent: false as const, reason: "ledger_unavailable" as const };
  }
  if (!rows[0]) return { sent: false as const, reason: "duplicate" as const };
  return deliver(rows[0]);
  } catch (reason) {
    console.error(`Email event failed safely for ${event.eventType}: ${reason instanceof Error ? reason.message.slice(0,300) : "unknown error"}.`);
    return { sent: false as const, reason: "ledger_unavailable" as const };
  }
}

export async function retryEmailEvent(id: string) {
  const lookup = await fetch(`${supabaseUrl()}/rest/v1/notification_events?id=eq.${encodeURIComponent(id)}&status=eq.failed&attempts=lt.${MAX_EMAIL_ATTEMPTS}&select=*&limit=1`, {
    headers: serviceHeaders(), cache: "no-store",
  });
  const current = lookup.ok ? await lookup.json().catch(() => []) as LedgerRow[] : [];
  if (!current[0]) return { sent: false as const, reason: "not_retryable" as const };
  const nextAttempts = Number(current[0].attempts) + 1;
  const claim = await fetch(`${supabaseUrl()}/rest/v1/notification_events?id=eq.${encodeURIComponent(id)}&status=eq.failed&attempts=eq.${current[0].attempts}`, {
    method: "PATCH",
    headers: { ...serviceHeaders(), Prefer: "return=representation" },
    body: JSON.stringify({ status: "pending", attempts: nextAttempts, last_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  });
  const rows = claim.ok ? await claim.json().catch(() => []) as LedgerRow[] : [];
  if (!rows[0]) return { sent: false as const, reason: "not_retryable" as const };
  return deliver(rows[0]);
}

export async function sendOrderEmail(args: Omit<SendEvent, "recipient"> & { recipient?: string | null; userId?: string | null }) {
  try {
    const recipient = args.recipient ?? (args.userId ? await getUserEmail(args.userId) : null);
    return sendEmailEvent({ ...args, recipient });
  } catch (reason) {
    console.error(`Order email lookup failed safely for ${args.eventType}: ${reason instanceof Error ? reason.message.slice(0,300) : "unknown error"}.`);
    return { sent: false as const, reason: "recipient_lookup_failed" as const };
  }
}

export function adminRecipient() {
  return cleanEmail(process.env.ADMIN_NOTIFICATION_EMAIL);
}

export function siteUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://runevault-beta.vercel.app").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
