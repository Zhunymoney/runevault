"use client";

import { FormEvent, useEffect, useState } from "react";
import { Headphones, MessageCircle, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { parseApiResponse } from "@/lib/client-api";
import { openSupportAttachment, type SupportAttachment, uploadSupportAttachment } from "@/lib/support-attachments";
import { useSupportRealtime } from "@/lib/use-support-realtime";

type Message = {
  id: string;
  sender_type: "customer" | "staff" | "system";
  body: string;
  created_at: string;
};
type Props = { externalProvider?: string; externalUrl?: string };
const idKey = "runevault-chat-id",
  tokenKey = "runevault-chat-token";

export function ChatWidget({ externalProvider, externalUrl }: Props) {
  const [open, setOpen] = useState(false),
    [id, setId] = useState(""),
    [token, setToken] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [attachments, setAttachments] = useState<SupportAttachment[]>([]),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [availability, setAvailability] = useState("offline"),
    [responseTime, setResponseTime] = useState(
      "We usually reply within one business day.",
    );
  const realtime = useSupportRealtime("customer", () => { if (open && id) void load(); });
  useEffect(() => {
    setId(localStorage.getItem(idKey) ?? "");
    setToken(localStorage.getItem(tokenKey) ?? "");
  }, []);
  async function headers() {
    const { data } = await createClient().auth.getSession();
    return {
      "Content-Type": "application/json",
      ...(data.session?.access_token
        ? { Authorization: `Bearer ${data.session.access_token}` }
        : {}),
      ...(token ? { "x-chat-token": token } : {}),
    };
  }
  async function load() {
    if (!id) return;
    try {
      const response = await fetch(
        `/api/support/chat?id=${encodeURIComponent(id)}`,
        { headers: await headers(), cache: "no-store" },
      );
      const data = await parseApiResponse(response);
      setMessages(
        Array.isArray(data.messages) ? (data.messages as Message[]) : [],
      );
      setAttachments(Array.isArray(data.attachments) ? data.attachments as SupportAttachment[] : []);
      setAvailability(
        typeof data.availability === "string" ? data.availability : "offline",
      );
      setResponseTime(
        typeof data.responseTime === "string"
          ? data.responseTime
          : responseTime,
      );
    } catch (reason) {
      setNotice(
        reason instanceof Error ? reason.message : "Chat could not be loaded.",
      );
    }
  }
  // Polling is keyed to the persisted conversation credentials; `load` is intentionally local.
  useEffect(() => {
    if (!open || !id) return;
    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, id, token]);
  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    const form = event.currentTarget;
    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
      });
      const data = await parseApiResponse(response);
      const conversation = data.conversation as { id?: string } | undefined;
      if (!conversation?.id)
        throw new Error("Chat returned no conversation reference.");
      const nextToken = typeof data.token === "string" ? data.token : "";
      localStorage.setItem(idKey, conversation.id);
      if (nextToken) localStorage.setItem(tokenKey, nextToken);
      setId(conversation.id);
      setToken(nextToken);
      setAvailability(
        typeof data.availability === "string" ? data.availability : "offline",
      );
      setResponseTime(
        typeof data.responseTime === "string"
          ? data.responseTime
          : responseTime,
      );
      form.reset();
    } catch (reason) {
      setNotice(
        reason instanceof Error ? reason.message : "Chat could not be started.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget;
    const message = String(new FormData(form).get("message") ?? "").trim();
    try {
      await parseApiResponse(
        await fetch("/api/support/chat", {
          method: "PATCH",
          headers: await headers(),
          body: JSON.stringify({ conversationId: id, message }),
        }),
      );
      form.reset();
      realtime.sendTyping(id, false);
      await load();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Message failed.");
    } finally {
      setBusy(false);
    }
  }
  async function attach(file: File) {
    setBusy(true); setNotice("");
    try { await uploadSupportAttachment("chat", id, file, token); setNotice("Attachment saved privately."); await load(); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : "Attachment failed."); }
    finally { setBusy(false); }
  }
  function reset() {
    localStorage.removeItem(idKey);
    localStorage.removeItem(tokenKey);
    setId("");
    setToken("");
    setMessages([]);
    setAttachments([]);
    setNotice("");
  }
  let safeExternal = "";
  try {
    if (externalUrl) {
      const parsed = new URL(externalUrl);
      if (parsed.protocol === "https:") safeExternal = parsed.toString();
    }
  } catch {}
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <section className="w-[min(92vw,390px)] overflow-hidden rounded-3xl border border-white/15 bg-[#0b0e14] shadow-2xl">
          <header className="flex items-center justify-between border-b border-white/10 p-4">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-amber-400/10 p-2 text-amber-300">
                <Headphones size={19} />
              </span>
              <div>
                <b>RuneVault support</b>
                <p className="text-xs capitalize text-white/40">
                  {realtime.staffOnline ? "online" : availability} · {responseTime}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close support chat"
              className="rounded-lg p-2 text-white/50 hover:bg-white/5"
            >
              <X size={18} />
            </button>
          </header>
          {safeExternal && externalProvider ? (
            <div className="border-b border-white/10 p-3 text-xs text-white/45">
              Prefer {externalProvider}?{" "}
              <a
                href={safeExternal}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-amber-300"
              >
                Open provider
              </a>
            </div>
          ) : null}
          <div className="max-h-[360px] overflow-y-auto p-4">
            {!id ? (
              <form onSubmit={start} className="grid gap-3">
                <p className="text-sm leading-6 text-white/50">
                  Start a secure conversation. Guest chats are protected by a
                  token stored only in this browser.
                </p>
                <input
                  required
                  name="name"
                  minLength={2}
                  maxLength={100}
                  placeholder="Name"
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                />
                <input
                  required
                  name="email"
                  type="email"
                  placeholder="Email"
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    name="runescapeName"
                    maxLength={12}
                    placeholder="OSRS name"
                    className="rounded-xl border border-white/10 bg-white/5 p-3"
                  />
                  <input
                    name="orderReference"
                    placeholder="RV-... (signed in)"
                    className="rounded-xl border border-white/10 bg-white/5 p-3 uppercase"
                  />
                </div>
                <textarea
                  required
                  name="message"
                  minLength={5}
                  maxLength={10000}
                  rows={4}
                  placeholder="How can we help?"
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                />
                <button
                  disabled={busy}
                  className="rounded-xl bg-amber-400 p-3 font-black text-black disabled:opacity-50"
                >
                  {busy ? "Starting..." : "Start conversation"}
                </button>
              </form>
            ) : (
              <>
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[88%] rounded-2xl p-3 text-sm ${message.sender_type === "customer" ? "ml-auto bg-amber-400 text-black" : "bg-white/10 text-white/75"}`}
                    >
                      <p className="whitespace-pre-wrap">{message.body}</p>
                      <time className="mt-1 block text-[10px] opacity-55">
                        {new Date(message.created_at).toLocaleString()}
                      </time>
                    </div>
                  ))}
                  {!messages.length && (
                    <p className="text-sm text-white/35">
                      No messages loaded yet.
                    </p>
                  )}
                </div>
                <form onSubmit={send} className="mt-4 flex gap-2">
                  <input
                    required
                    name="message"
                    maxLength={10000}
                    placeholder="Write a reply"
                    onChange={(event) => realtime.sendTyping(id, event.target.value.trim().length > 0)}
                    onBlur={() => realtime.sendTyping(id, false)}
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 p-3"
                  />
                  <button
                    disabled={busy}
                    aria-label="Send message"
                    className="rounded-xl bg-amber-400 px-4 text-black disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </form>
                {realtime.typing[id] === "staff" && <p className="mt-2 text-xs text-white/40">Support is typing…</p>}
                {!!attachments.length && <div className="mt-3 flex flex-wrap gap-2">{attachments.map((attachment)=><button key={attachment.id} type="button" onClick={()=>void openSupportAttachment(attachment.id,token).catch(reason=>setNotice(reason instanceof Error?reason.message:"Attachment could not be opened."))} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-amber-200">Open {attachment.mime_type === "application/pdf" ? "PDF" : "image"}</button>)}</div>}
                <label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-white/10 p-3 text-center text-xs font-bold text-white/45">Attach image or PDF<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" disabled={busy} onChange={event=>{const file=event.target.files?.[0];if(file)void attach(file);event.currentTarget.value="";}}/></label>
                <button
                  onClick={reset}
                  className="mt-3 text-xs font-bold text-white/35 hover:text-white"
                >
                  End this local chat session
                </button>
              </>
            )}
          </div>
          {notice && (
            <p
              role="status"
              className="border-t border-white/10 p-3 text-xs text-rose-200"
            >
              {notice}
            </p>
          )}
        </section>
      )}
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label="Open RuneVault support chat"
        className="flex h-14 items-center gap-2 rounded-2xl bg-amber-400 px-5 font-black text-black shadow-xl"
      >
        <MessageCircle size={21} />
        Chat
      </button>
    </div>
  );
}
