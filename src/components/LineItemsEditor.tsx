"use client";
/**
 * LineItemsEditor.tsx — add / edit / delete / reorder rows.
 * Uses React Hook Form's useFieldArray, which keeps track of a list of inputs.
 */
import { useFieldArray, useWatch, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import type { DocumentFormValues } from "@/lib/schema";
import { lineAmount } from "@/lib/calc";
import { money, uid } from "@/lib/format";
import { Button, inputClass } from "./ui";

interface Props {
  control: Control<DocumentFormValues>;
  register: UseFormRegister<DocumentFormValues>;
  errors: FieldErrors<DocumentFormValues>;
  currency: string;
  showDays: boolean;
}

export function LineItemsEditor({ control, register, errors, currency, showDays }: Props) {
  const { fields, append, remove, move } = useFieldArray({ control, name: "items" });
  // Watch the live values so the "Amount" column updates while typing.
  const items = useWatch({ control, name: "items" });

  const listError = errors.items?.message ?? errors.items?.root?.message;

  return (
    <div>
      <ol className="space-y-3">
        {fields.map((field, i) => {
          const e = errors.items?.[i];
          const item = items?.[i] ?? { quantity: 0, unitPrice: 0, days: undefined };
          const amount = lineAmount({ ...item, days: showDays ? (item.days ?? 1) : undefined });
          return (
            // Each item is a small card: description on top, numbers underneath.
            // This works in a narrow column (desktop split view) and on phones.
            <li key={field.id} className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">Item {i + 1}</span>
                <div className="flex gap-1">
                  <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>
                    ↑
                  </IconButton>
                  <IconButton label="Move down" disabled={i === fields.length - 1} onClick={() => move(i, i + 1)}>
                    ↓
                  </IconButton>
                  <IconButton label="Delete row" disabled={fields.length === 1} onClick={() => remove(i)} danger>
                    ✕
                  </IconButton>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  {...register(`items.${i}.title`)}
                  placeholder="Title (bold, optional), e.g. Videography"
                  className={inputClass + " font-semibold"}
                  aria-label={`Item ${i + 1} title`}
                />
                <textarea
                  {...register(`items.${i}.description`)}
                  rows={2}
                  placeholder="Description, e.g. Videography With Editing - ADIPEC 2026"
                  className={inputClass}
                  aria-invalid={!!e?.description}
                  aria-label={`Item ${i + 1} description`}
                />
                {e?.description ? <p className="text-xs text-red-600">{e.description.message}</p> : null}
                {e?.title ? <p className="text-xs text-red-600">{e.title.message}</p> : null}
              </div>

              <div className={`mt-2 grid grid-cols-2 gap-2 ${showDays ? "sm:grid-cols-[1fr_1fr_1.4fr_1.2fr]" : "sm:grid-cols-[1fr_1.4fr_1.2fr]"}`}>
                <label>
                  <span className="text-xs text-slate-500">No of Crew</span>
                  <input
                    {...register(`items.${i}.quantity`, { valueAsNumber: true })}
                    type="number"
                    step="any"
                    inputMode="decimal"
                    className={inputClass}
                    aria-invalid={!!e?.quantity}
                  />
                  {e?.quantity ? <span className="mt-1 block text-xs text-red-600">{e.quantity.message}</span> : null}
                </label>
                {showDays ? (
                  <label>
                    <span className="text-xs text-slate-500">No of Days</span>
                    <input
                      {...register(`items.${i}.days`, { valueAsNumber: true })}
                      type="number"
                      step="1"
                      min="1"
                      inputMode="numeric"
                      className={inputClass}
                      aria-invalid={!!e?.days}
                    />
                    {e?.days ? <span className="mt-1 block text-xs text-red-600">{e.days.message}</span> : null}
                  </label>
                ) : null}
                <label>
                  <span className="text-xs text-slate-500">Unit price ({currency})</span>
                  <input
                    {...register(`items.${i}.unitPrice`, { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    className={inputClass}
                    aria-invalid={!!e?.unitPrice}
                  />
                  {e?.unitPrice ? <span className="mt-1 block text-xs text-red-600">{e.unitPrice.message}</span> : null}
                </label>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Amount</span>
                  <p className="py-2 text-sm font-semibold tabular-nums text-slate-900">{money(amount)}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {listError ? <p className="mt-2 text-sm text-red-600">{listError}</p> : null}

      <Button
        className="mt-3"
        onClick={() => append({ id: uid(), title: "", description: "", quantity: 1, unit: "Crew", unitPrice: 0, days: 1 })}
      >
        + Add line item
      </Button>
    </div>
  );
}

function IconButton({
  label,
  danger,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      {...props}
      className={
        "h-8 w-7 rounded border text-sm disabled:opacity-30 " +
        (danger ? "border-red-200 text-red-600 hover:bg-red-50" : "border-slate-300 text-slate-600 hover:bg-white")
      }
    />
  );
}
