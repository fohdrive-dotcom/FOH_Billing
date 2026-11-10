import type { DocStatus, DocType } from "@/lib/types";
import { cx } from "./ui";

const COLORS: Record<DocStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: DocStatus }) {
  return (
    <span className={cx("inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize", COLORS[status])}>
      {status}
    </span>
  );
}

export function TypeBadge({ type }: { type: DocType }) {
  return (
    <span
      className={cx(
        "inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase",
        type === "invoice" ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-800",
      )}
    >
      {type === "invoice" ? "Invoice" : "Quote"}
    </span>
  );
}
