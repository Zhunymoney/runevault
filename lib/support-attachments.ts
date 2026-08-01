import { parseApiResponse } from "@/lib/client-api";
import { createClient } from "@/lib/supabase-browser";

export type SupportAttachment = { id: string; mime_type: string; size_bytes: number; created_at: string };

async function accessHeaders(guestToken?: string) {
  const { data } = await createClient().auth.getSession();
  return { ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}), ...(guestToken ? { "x-chat-token": guestToken } : {}) };
}

export async function uploadSupportAttachment(kind: "ticket" | "chat", id: string, file: File, guestToken?: string) {
  const form = new FormData(); form.set("kind", kind); form.set("id", id); form.set("file", file);
  const data = await parseApiResponse(await fetch("/api/support/attachments", { method: "POST", headers: await accessHeaders(guestToken), body: form }));
  return data.attachment as SupportAttachment;
}

export async function openSupportAttachment(id: string, guestToken?: string) {
  const data = await parseApiResponse(await fetch(`/api/support/attachments?id=${encodeURIComponent(id)}`, { headers: await accessHeaders(guestToken), cache: "no-store" }));
  if (typeof data.url !== "string" || !data.url.startsWith("https://")) throw new Error("Attachment returned no secure download link.");
  window.open(data.url, "_blank", "noopener,noreferrer");
}
