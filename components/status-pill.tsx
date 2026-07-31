import type { OrderStatus } from "@/lib/types";

const styles: Record<OrderStatus, string> = {
  pending: "border-amber-300/20 bg-amber-300/[.08] text-amber-200",
  awaiting_payment: "border-orange-300/20 bg-orange-300/[.08] text-orange-200",
  paid: "border-sky-300/20 bg-sky-300/[.08] text-sky-200",
  assigned: "border-violet-300/20 bg-violet-300/[.08] text-violet-200",
  delivering: "border-cyan-300/20 bg-cyan-300/[.08] text-cyan-200",
  completed: "border-emerald-300/20 bg-emerald-300/[.08] text-emerald-200",
  cancelled: "border-red-300/20 bg-red-300/[.08] text-red-200",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-black capitalize ${styles[status]}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
