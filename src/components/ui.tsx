/**
 * ui.tsx — tiny reusable building blocks styled with Tailwind.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Joins class names, skipping empty ones. */
export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm " +
  "focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 " +
  "disabled:bg-slate-100 aria-[invalid=true]:border-red-500";

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  variant = "secondary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: "bg-indigo-700 text-white hover:bg-indigo-800 border-transparent",
    secondary: "bg-white text-slate-800 hover:bg-slate-50 border-slate-300",
    danger: "bg-white text-red-700 hover:bg-red-50 border-red-300",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100 border-transparent",
  };
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium",
        "disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        styles[variant],
        className,
      )}
    />
  );
}

/** Label + input + error message. */
export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="mt-1 block text-xs text-red-600">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      {title || actions ? (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title ? <h2 className="text-base font-semibold text-slate-900">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Loading({ text = "Loading…" }: { text?: string }) {
  return <p className="py-10 text-center text-sm text-slate-500">{text}</p>;
}
