"use client";
/**
 * /settings — business details, bank, tax, numbering, default terms,
 * logo & seal images, and backup / restore.
 */
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch, type UseFormRegister, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingsSchema, type SettingsFormValues } from "@/lib/schema";
import type { Settings } from "@/lib/types";
import { repo, invoiceNumberPlaceholder, quotationNumberPlaceholder } from "@/lib/storage";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { downloadBackup, readBackupFile } from "@/lib/backup";
import { applySheetToSettings, fetchSheetSettings, pushSheetSettings, sheetDiffers } from "@/lib/sheetSettings";
import { Button, Card, Field, Loading, PageHeader, cx, inputClass } from "@/components/ui";

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024; // 1.5 MB

export default function SettingsPage() {
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsFormValues>({ resolver: zodResolver(settingsSchema), defaultValues: DEFAULT_SETTINGS });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = await repo.getSettings();
      if (cancelled) return;
      reset(local);
      setLoaded(true);
      // The Google Sheet is the master copy: pull it in and keep it on this device too.
      try {
        const row = await fetchSheetSettings();
        if (cancelled || !sheetDiffers(local, row)) return;
        const merged = applySheetToSettings(local, row);
        await repo.saveSettings(merged);
        reset(merged);
        setMessage({ kind: "ok", text: "Settings updated from Google Sheet." });
      } catch (e) {
        if (!cancelled) setMessage({ kind: "error", text: `Could not read Google Sheet: ${e instanceof Error ? e.message : e}` });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reset]);

  const logo = useWatch({ control, name: "logoDataUrl" });
  const seal = useWatch({ control, name: "sealDataUrl" });
  const n = useWatch({ control });

  function flash(kind: "ok" | "error", text: string) {
    setMessage({ kind, text });
    setTimeout(() => setMessage(null), 5000);
  }

  const onSubmit = handleSubmit(
    async (v) => {
      const settings: Settings = { ...v, currency: v.currency.toUpperCase(), bank: { ...v.bank } };
      await repo.saveSettings(settings);
      reset(settings);
      // Also update the Google Sheet. The local save already worked, so a sheet error is only a warning.
      try {
        await pushSheetSettings(settings);
        flash("ok", "Settings saved (and updated in Google Sheet).");
      } catch (e) {
        flash("error", `Saved on this device, but Google Sheet update failed: ${e instanceof Error ? e.message : e}`);
      }
    },
    () => flash("error", "Please fix the highlighted fields."),
  );

  const [sheetLoading, setSheetLoading] = useState(false);

  /** Fills the form from the Google Sheet. Blank cells are ignored. Click "Save settings" to keep it. */
  async function loadFromSheet() {
    setSheetLoading(true);
    try {
      const row = await fetchSheetSettings();
      // keepDefaultValues -> the form shows "Unsaved changes" until you save.
      reset(applySheetToSettings(getValues(), row), { keepDefaultValues: true });
      flash("ok", "Loaded from Google Sheet. Click “Save settings” to keep these values.");
    } catch (e) {
      flash("error", e instanceof Error ? e.message : String(e));
    } finally {
      setSheetLoading(false);
    }
  }

  /** Reads an uploaded image into a data: URL so it can be stored in the browser. */
  function onImage(field: "logoDataUrl" | "sealDataUrl", file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      return flash("error", "Please upload a PNG or JPG. (SVG/WebP cannot be embedded in the PDF — convert it to PNG first.)");
    }
    if (file.size > MAX_IMAGE_BYTES) return flash("error", "Image is larger than 1.5 MB. Please resize it.");
    const reader = new FileReader();
    reader.onload = () => setValue(field, String(reader.result), { shouldDirty: true });
    reader.readAsDataURL(file);
  }

  async function onImport(file: File | undefined) {
    if (!file) return;
    try {
      const data = await readBackupFile(file);
      const warning =
        importMode === "replace"
          ? "REPLACE: this deletes all current documents and clients first. Continue?"
          : "MERGE: documents/clients from the file will be added (same ids are overwritten). Continue?";
      if (!confirm(`${warning}\n\nFile has ${data.documents.length} documents and ${data.clients.length} clients.`)) return;
      await repo.importAll(data, importMode);
      reset(await repo.getSettings());
      flash("ok", `Imported ${data.documents.length} documents and ${data.clients.length} clients.`);
    } catch (e) {
      flash("error", e instanceof Error ? e.message : String(e));
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  if (!loaded) return <Loading />;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 pb-24">
      <PageHeader title="Settings" />

      <Card title="Google Sheet">
        <p className="mb-3 text-sm text-slate-600">
          Settings are loaded from the Google Sheet when this page opens, and “Save settings” writes your changes back
          to the sheet. Logo and seal images stay on this device only.
        </p>
        <Button onClick={loadFromSheet} disabled={sheetLoading}>
          {sheetLoading ? "Loading…" : "⟳ Load from Google Sheet"}
        </Button>
      </Card>

      {message ? (
        <div
          role="status"
          className={cx(
            "rounded-md border px-3 py-2 text-sm",
            message.kind === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700",
          )}
        >
          {message.text}
        </div>
      ) : null}

      <Card title="Business details">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField register={register} label="Business name *" name="business.name" error={errors.business?.name?.message} />
          <TextField register={register} label="Tax / VAT number (TRN)" name="business.taxNumber" />
          <Field label="Address" hint="Use a new line for each address line." className="sm:col-span-2">
            <textarea {...register("business.address")} rows={3} className={inputClass} />
          </Field>
          <TextField register={register} label="Phone" name="business.phone" />
          <TextField register={register} label="Website" name="business.website" />
          <TextField register={register} label="Main email" name="business.email" error={errors.business?.email?.message} />
          <TextField register={register} label="Second email (quotations)" name="business.email2" error={errors.business?.email2?.message} />
          <TextField register={register} label="Tagline (invoice footer)" name="business.tagline" className="sm:col-span-2" />
          <TextField register={register} label="Signatory name" name="signatoryName" />
          <TextField register={register} label="Signatory title" name="signatoryTitle" hint="e.g. Managing Director" />
        </div>
      </Card>

      <Card title="Bank details (shown on invoices)">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField register={register} label="Beneficiary / account name" name="bank.beneficiary" />
          <TextField register={register} label="Bank name" name="bank.bankName" />
          <TextField register={register} label="Branch" name="bank.branch" />
          <TextField register={register} label="Account number" name="bank.accountNumber" />
          <TextField register={register} label="IBAN" name="bank.iban" error={errors.bank?.iban?.message} />
          <TextField register={register} label="SWIFT / BIC" name="bank.swift" error={errors.bank?.swift?.message} />
        </div>
      </Card>

      <Card title="Currency & numbering (VAT is fixed at 5%)">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField register={register} label="Currency code" name="currency" error={errors.currency?.message} hint="AED, USD, EUR…" />
          <div className="self-end rounded-md bg-slate-50 p-2 text-xs text-slate-600 sm:col-span-2">
            Invoice numbers are automatic: <b>FOH-DDMMYYYY-123</b> (save date + 3 random digits), e.g.{" "}
            <b>{invoiceNumberPlaceholder().replace("XXX", "482")}</b>
          </div>
          <div className="self-end rounded-md bg-slate-50 p-2 text-xs text-slate-600 sm:col-span-2">
            Quotation numbers are automatic: <b>FOH-QT-DDMMYYYY-001</b>, e.g.{" "}
            <b>{quotationNumberPlaceholder().replace("XXX", "001")}</b>
          </div>
          <NumberField register={register} label="Invoice due in (days)" name="paymentDays" error={errors.paymentDays?.message} />
          <NumberField register={register} label="Quotation valid for (days)" name="validityDays" error={errors.validityDays?.message} />
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" {...register("quotationShowUnitPrice")} className="h-4 w-4 accent-indigo-700" />
            Show “Unit Price” column on quotations
          </label>
        </div>
      </Card>

      <Card title="Default terms & notes">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Invoice terms" hint="One term per line.">
            <textarea {...register("invoiceTerms")} rows={4} className={inputClass} />
          </Field>
          <Field label="Quotation terms" hint="One term per line (shown as bullets).">
            <textarea {...register("quotationTerms")} rows={4} className={inputClass} />
          </Field>
          <Field label="Invoice notes">
            <textarea {...register("invoiceNotes")} rows={2} className={inputClass} />
          </Field>
          <Field label="Quotation notes">
            <textarea {...register("quotationNotes")} rows={2} className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card title="Logo & seal">
        <div className="grid gap-6 sm:grid-cols-2">
          <ImagePicker
            label="Logo"
            current={logo || "/assets/logo.png"}
            custom={!!logo}
            onFile={(f) => onImage("logoDataUrl", f)}
            onReset={() => setValue("logoDataUrl", "", { shouldDirty: true })}
          />
          <ImagePicker
            label="Seal / stamp (transparent PNG works best)"
            current={seal || "/assets/seal.png"}
            custom={!!seal}
            onFile={(f) => onImage("sealDataUrl", f)}
            onReset={() => setValue("sealDataUrl", "", { shouldDirty: true })}
          />
        </div>
      </Card>

      <Card title="Backup & restore">
        <p className="mb-3 text-sm text-slate-600">
          Your data is saved <b>only in this browser</b>. Download a backup regularly (and before clearing browser data or
          switching computers).
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => downloadBackup()}>⬇ Export backup (.json)</Button>
          <select
            value={importMode}
            onChange={(e) => setImportMode(e.target.value as "merge" | "replace")}
            className={inputClass + " w-auto"}
            aria-label="Import mode"
          >
            <option value="merge">Import: merge with current data</option>
            <option value="replace">Import: replace all current data</option>
          </select>
          <Button onClick={() => importRef.current?.click()}>⬆ Import backup…</Button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => onImport(e.target.files?.[0])}
          />
        </div>
      </Card>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3">
          {isDirty ? <span className="text-xs text-amber-700">Unsaved changes</span> : null}
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            Save settings
          </Button>
        </div>
      </div>
    </form>
  );
}

function TextField({
  register,
  label,
  name,
  error,
  hint,
  className,
}: {
  register: UseFormRegister<SettingsFormValues>;
  label: string;
  name: Path<SettingsFormValues>;
  error?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      <input {...register(name)} className={inputClass} aria-invalid={!!error} />
    </Field>
  );
}

function NumberField({
  register,
  label,
  name,
  error,
}: {
  register: UseFormRegister<SettingsFormValues>;
  label: string;
  name: Path<SettingsFormValues>;
  error?: string;
}) {
  return (
    <Field label={label} error={error}>
      <input
        type="number"
        step="any"
        inputMode="decimal"
        {...register(name, { valueAsNumber: true })}
        className={inputClass}
        aria-invalid={!!error}
      />
    </Field>
  );
}

function ImagePicker({
  label,
  current,
  custom,
  onFile,
  onReset,
}: {
  label: string;
  current: string;
  custom: boolean;
  onFile: (f: File | undefined) => void;
  onReset: () => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</p>
      <div className="mb-2 flex h-32 items-center justify-center rounded-md border border-dashed border-slate-300 bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px] p-3">
        {/* Plain <img> on purpose: it can show data: URLs from the browser */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={label} className="max-h-full max-w-full object-contain" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
          Replace…
          <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {custom ? (
          <Button variant="ghost" onClick={onReset}>
            Use default file
          </Button>
        ) : (
          <span className="text-xs text-slate-500">Using the file in /public/assets</span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">Click “Save settings” after replacing.</p>
    </div>
  );
}
