"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type Role = "customer" | "staff";
type TypingPayload = { conversationId?: string; role?: Role; typing?: boolean };
type Listener = {
  role: Role;
  onMessage: () => void;
  onPresence: (online: boolean) => void;
  onTyping: (payload: TypingPayload) => void;
};
type Client = ReturnType<typeof createClient>;
type Channel = ReturnType<Client["channel"]>;
type SharedRealtime = {
  client: Client;
  channel: Channel;
  listeners: Set<Listener>;
  subscribed: boolean;
};

let shared: SharedRealtime | null = null;

function trackedRole(listeners: Set<Listener>): Role {
  return [...listeners].some((listener) => listener.role === "staff")
    ? "staff"
    : "customer";
}

function getShared(firstListener: Listener) {
  if (shared) {
    shared.listeners.add(firstListener);
    if (shared.subscribed)
      void shared.channel.track({
        role: trackedRole(shared.listeners),
        onlineAt: new Date().toISOString(),
      });
    return shared;
  }

  const client = createClient();
  const listeners = new Set([firstListener]);
  const channel = client.channel("runevault-support-presence", {
    config: { presence: { key: `browser-${crypto.randomUUID()}` } },
  });
  shared = { client, channel, listeners, subscribed: false };
  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ role?: Role }>();
      const online = Object.values(state)
        .flat()
        .some((entry) => entry.role === "staff");
      for (const listener of listeners) listener.onPresence(online);
    })
    .on(
      "broadcast",
      { event: "typing" },
      ({ payload }: { payload: TypingPayload }) => {
        for (const listener of listeners) listener.onTyping(payload);
      },
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages" },
      () => {
        for (const listener of listeners) listener.onMessage();
      },
    )
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        if (shared?.channel === channel) shared.subscribed = true;
        await channel.track({
          role: trackedRole(listeners),
          onlineAt: new Date().toISOString(),
        });
      }
    });
  return shared;
}

export function useSupportRealtime(role: Role, onMessage: () => void) {
  const [staffOnline, setStaffOnline] = useState(false);
  const [typing, setTyping] = useState<Record<string, Role | undefined>>({});
  const callbackRef = useRef(onMessage);
  useEffect(() => {
    callbackRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const listener: Listener = {
      role,
      onMessage: () => callbackRef.current(),
      onPresence: setStaffOnline,
      onTyping: (payload) => {
        if (!payload.conversationId || payload.role === role) return;
        setTyping((current) => ({
          ...current,
          [payload.conversationId!]: payload.typing ? payload.role : undefined,
        }));
      },
    };
    const realtime = getShared(listener);
    return () => {
      realtime.listeners.delete(listener);
      if (realtime.listeners.size && realtime.subscribed)
        void realtime.channel.track({
          role: trackedRole(realtime.listeners),
          onlineAt: new Date().toISOString(),
        });
    };
  }, [role]);

  const sendTyping = useCallback(
    (conversationId: string, active: boolean) => {
      if (!conversationId || !shared) return;
      void shared.channel.send({
        type: "broadcast",
        event: "typing",
        payload: { conversationId, role, typing: active },
      });
    },
    [role],
  );

  return { staffOnline, typing, sendTyping };
}
