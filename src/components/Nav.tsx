"use client";
/**
 * Nav.tsx — top navigation bar. Scrolls sideways on small phones.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/new?type=invoice", label: "+ Invoice" },
  { href: "/new?type=quotation", label: "+ Quotation" },
  { href: "/documents", label: "Documents" },
  { href: "/clients", label: "Clients" },
  { href: "/settings", label: "Settings" },
];

/** Reads the current URL to highlight the active link. Must be inside <Suspense> (see layout.tsx). */
export function Nav() {
  return <NavView pathname={usePathname()} />;
}

/** The nav bar itself. Also used (with pathname "") as the Suspense fallback. */
export function NavView({ pathname }: { pathname: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="shrink-0 py-3 text-lg font-black tracking-tight text-slate-900">
          FOH <span className="font-medium text-slate-500">Billing</span>
        </Link>
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {LINKS.map((l) => {
            const path = l.href.split("?")[0];
            const active = path === "/" ? pathname === "/" : pathname.startsWith(path) && !l.href.includes("?");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cx(
                  "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium",
                  active
                    ? "border-indigo-700 text-indigo-700"
                    : "border-transparent text-slate-600 hover:text-slate-900",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
