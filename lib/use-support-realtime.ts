"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type Role = "customer" | "staff";
type TypingPayload = { conversationId?: string; role?: Role; typing?: boolean };

export function useSupportRealtime(role: Role, onMessage: () => void) {
  const [staffOnline, setStaffOnline] = useState(false);
  const [typing, setTyping] = useState<Record<string, Role | undefined>>({});
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const callbackRef = useRef(onMessage);
  useEffect(() => { callbackRef.current = onMessage; }, [onMessage]);

  useEffect(() => {
    const client = createClient();
    const channel = client.channel("runevault-support-presence", {
      config: { presence: { key: `${role}-${crypto.randomUUID()}` } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ role?: Role }>();
        setStaffOnline(Object.values(state).flat().some((entry) => entry.role === "staff"));
      })
      .on("broadcast", { event: "typing" }, ({ payload }: { payload: TypingPayload }) => {
        if (!payload.conversationId || payload.role === role) return;
        setTyping((current) => ({ ...current, [payload.conversationId!]: payload.typing ? payload.role : undefined }));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => callbackRef.current())
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ role, onlineAt: new Date().toISOString() });
      });
    channelRef.current = channel;
    return () => { channelRef.current = null; void client.removeChannel(channel); };
  }, [role]);

  const sendTyping = useCallback((conversationId: string, active: boolean) => {
    if (!conversationId) return;
    void channelRef.current?.send({ type: "broadcast", event: "typing", payload: { conversationId, role, typing: active } });
  }, [role]);

  return { staffOnline, typing, sendTyping };
}
