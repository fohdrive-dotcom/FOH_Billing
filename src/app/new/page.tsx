"use client";
/**
 * /new?type=invoice | /new?type=quotation  — create a document
 * /new?from=<id>                            — create a copy of an existing document
 */
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AppDocument } from "@/lib/types";
import { repo } from "@/lib/storage";
import { newDocument } from "@/lib/defaults";
import { copyOf } from "@/lib/docActions";
import { useSettings } from "@/lib/useSettings";
import { DocumentEditor } from "@/components/DocumentEditor";
import { Loading } from "@/components/ui";

function NewDocumentInner() {
  const params = useSearchParams();
  const type = params.get("type") === "quotation" ? "quotation" : "invoice";
  const from = params.get("from");
  const { settings, error } = useSettings();
  const [initial, setInitial] = useState<AppDocument | null>(null);

  useEffect(() => {
    if (!settings) return;
    (async () => {
      if (from) {
        const source = await repo.getDocument(from);
        if (source) return setInitial(copyOf(source));
      }
      setInitial(newDocument(type, settings));
    })();
  }, [settings, type, from]);

  if (error) return <p className="text-red-600">Could not open browser storage: {error}</p>;
  if (!settings || !initial) return <Loading />;
  // `key` makes React start a fresh form when you click "+ Invoice" / "+ Quotation" in the menu.
  return <DocumentEditor key={initial.id} initial={initial} settings={settings} isNew />;
}

export default function NewDocumentPage() {
  // useSearchParams must be inside <Suspense> in Next.js App Router.
  return (
    <Suspense fallback={<Loading />}>
      <NewDocumentInner />
    </Suspense>
  );
}
