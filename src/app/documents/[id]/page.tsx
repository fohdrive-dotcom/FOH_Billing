"use client";
/**
 * /documents/[id] — open a saved invoice/quotation to view, edit or re-download.
 */
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { AppDocument } from "@/lib/types";
import { repo } from "@/lib/storage";
import { useSettings } from "@/lib/useSettings";
import { DocumentEditor } from "@/components/DocumentEditor";
import { Loading } from "@/components/ui";

function EditDocumentInner() {
  const { id } = useParams<{ id: string }>();
  const { settings } = useSettings();
  const [doc, setDoc] = useState<AppDocument | null | undefined>(undefined);

  useEffect(() => {
    repo.getDocument(id).then((d) => setDoc(d ?? null));
  }, [id]);

  if (doc === null) {
    return (
      <div className="py-10 text-center">
        <p className="mb-3 text-slate-600">Document not found. It may have been deleted.</p>
        <Link href="/documents" className="text-indigo-700 underline">
          Back to documents
        </Link>
      </div>
    );
  }
  if (!doc || !settings) return <Loading />;
  // Next.js keeps recently visited pages alive (hidden). The effect above re-runs when
  // you come back, and `updatedAt` in the key makes the form restart with fresh data
  // if the document was changed elsewhere (e.g. status changed on the list page).
  return <DocumentEditor key={doc.id + doc.updatedAt} initial={doc} settings={settings} isNew={false} />;
}

export default function EditDocumentPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EditDocumentInner />
    </Suspense>
  );
}
