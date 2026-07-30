import type { OrderStatus } from "@/lib/types";
const labels:Record<OrderStatus,string>={pending:"Pending",awaiting_payment:"Awaiting payment",paid:"Paid",assigned:"Assigned",delivering:"Delivering",completed:"Completed",cancelled:"Cancelled"};
export function StatusPill({status}:{status:OrderStatus}){return <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">{labels[status]}</span>}
