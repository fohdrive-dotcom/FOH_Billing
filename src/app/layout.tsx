import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Nav, NavView } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "FOH Billing — Invoices & Quotations",
  description: "Create invoices and quotations for FOH Media & Events",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-100 text-slate-900">
        {/* Next.js requires URL-reading client components to be inside <Suspense> */}
        <Suspense fallback={<NavView pathname="" />}>
          <Nav />
        </Suspense>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
