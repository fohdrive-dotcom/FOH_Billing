# FOH Billing — Invoice & Quotation Generator

A Next.js web app for **FOH Media & Events** that creates invoices and quotations and downloads them as PDFs matching your company templates (logo, stamp, tables, bank details).

Everything runs **in the browser**: no server, no database, no login. Data is stored in the browser's IndexedDB.

---

## 1. How it works (overview)

1. You fill in the form at `/new?type=invoice` or `/new?type=quotation`.
2. Totals (subtotal → discount → VAT → grand total) and the amount in words update while you type.
3. A **live PDF preview** is built in the browser 0.6 s after you stop typing.
4. **Save** stores the document in IndexedDB and reserves the next number (INV-0001, QT-0001…).
5. **Save & Download PDF** also downloads `INV-0001_Client_Name.pdf`.

### Why `@react-pdf/renderer` (not pdf-lib)

Your templates are Canva exports with fixed text positions. **pdf-lib** can only stamp text on top of a fixed PDF, so a long items table could not grow or flow onto a second page. **@react-pdf/renderer** rebuilds the design as React components with real layout. Rows wrap onto new pages automatically, the table header and footer repeat, and the logo and seal are embedded as images.

---

## 2. Analysis of your templates

### QUOTATION.pdf

| Part | Fixed or dynamic | How it's built |
|---|---|---|
| Gradient bar "QUOTATION" (top-left) | Fixed | SVG linear gradient `#8B94CB → #283A8C`, white bold text |
| Logo (top-right) | Image | `/public/assets/logo.png` or uploaded in Settings |
| "From:" block | From **Settings** | Business name, address, phone, both emails |
| Date | **Dynamic** | Issue date as "November 09, 2026"; also shows Valid until + Quotation No. (not in your sample, added because the app needs them) |
| Prepared for + client | **Dynamic** | Client name (bold), plus address/TRN if entered |
| Table: Sl No. / Description / Quantity / Total | **Dynamic** rows | Navy header `#2E3F8E`, 1.5pt black borders, bold item title + description |
| TOTAL AMOUNT bar | **Dynamic** | Navy bar. Sub total / discount / VAT rows appear only when used |
| Amount in words | **Dynamic** | Added (you asked for it; your sample doesn't have one) |
| TERMS AND CONDITIONS | From Settings, editable per document | One bullet per line |
| Seal + "Authorized By" | Toggle per document | Seal rotated −6° like a real stamp |

### INVOICE.pdf (Tax Invoice)

| Part | Fixed or dynamic | How it's built |
|---|---|---|
| Logo (top-left) | Image | same logo file |
| TAX INVOICE / Invoice No. / Date | **Dynamic** | Title becomes "INVOICE" when VAT is 0% |
| Company block with TRN | From Settings | |
| Bill To + TRN | **Dynamic** | Address/phone/email added if entered |
| Light "FOH" watermark | Fixed | Your logo at 4.5% opacity |
| 7-column table | **Dynamic** | Sl No, Description, Quantity, Unit Price, Vat %, Total Vat, Total |
| Sub Total / VAT / Grand Total | **Dynamic** | Discount + taxable amount rows appear only when there is a discount |
| Amount in words | **Dynamic** | Correctly calculated (see note below) |
| Terms & Condition, Bank Details | From Settings | |
| Received by / Seal / "FOR FOH MEDIA & EVENTS L.L.C" | Seal toggle | |
| Footer: phone, email, tagline bar | Fixed, repeats on every page | Page numbers appear only when there are 2+ pages |

### Fonts and colours

- Body text: **Open Sans** (same as your PDFs). Accent text (client name, totals, bank details): **DM Sans**.
- **Noto Sans Arabic** is registered as a fallback font, so Arabic client names print correctly.
- All fonts are in `/public/fonts` (free Google Fonts, OFL licence).

### Things that cannot be reproduced exactly (and what was done instead)

1. **Logo style:** your quotation uses a "FOH / M E D I A" logo variant, but only the "FOH MEDIA AND EVENTS" logo was supplied, so both documents use it. Upload the other one in Settings if you want them to differ (separate logos per type would need a small code change).
2. **Watermark:** your invoice watermark shows only "FOH"; the app uses the full logo, very faint.
3. **Font weights:** the Canva fonts are matched closely, not pixel-perfect. Spacing is measured from your PDFs.
4. **Quotation "Unit Price" column:** your quotation has none, so it's off by default. Turn it on in Settings.
5. **Seal on every page:** the seal and signature appear **once, at the end** of the document, like a real signed document. The logo header (small, page 2+), footer and page numbers repeat on every page.

### ⚠️ Problems found in your sample files

- **INVOICE.pdf amount in words is wrong:** it says "Nine Hundred Forty Five Dirhams Only" but the total is **735.00**. The app computes it automatically: "Seven Hundred Thirty Five Dirhams Only".
- **QUOTATION.pdf says prices exclude VAT, but shows 735.00**, which is the *VAT-inclusive* amount from the invoice (700 + 5%). In the app, quotations default to 0% VAT (as the terms say), and converting to an invoice adds 5%.
- The two templates use **different addresses** ("Shabia 09, Abu Dhabi" vs "Shabia, ME9, Musaffah"). Choose one in Settings.

---

## 3. Setup, step by step

### 3.1 Install Node.js
1. Go to <https://nodejs.org> and download the **LTS** version (20 or newer). This PC already has Node 24.
2. Check it in a terminal: `node -v` and `npm -v`.

### 3.2 The project is already created
This folder was made with:
```bash
npx create-next-app@latest foh-billing --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd foh-billing
npm install @react-pdf/renderer react-hook-form zod @hookform/resolvers idb
```
If you copy the project to another computer, just run `npm install` inside the folder.

### 3.3 Where the files go
```
public/assets/logo.png    ← your logo (PNG or JPG)
public/assets/seal.png    ← your stamp (transparent PNG)
public/fonts/*.ttf        ← fonts used inside the PDF
```
To replace them, overwrite these files with the same names, or upload new ones in **Settings → Logo & seal**. ⚠️ The PDF engine accepts **PNG/JPG only**; convert SVG or WebP to PNG first.

### 3.4 Run it
```bash
cd "C:\Jishnu\foh\Billing App\foh-billing"
npm run dev
```
Open <http://localhost:3000>. Stop it with `Ctrl + C`.

### 3.5 First things to do
1. Open **Settings**. Check the address, add the signatory name/title and SWIFT code, then click **Save settings**.
2. Optional: **Settings → Import backup** → `sample-data/sample-backup.json` to load test data.

All placeholders that need your input are marked `// TODO: replace this` in `src/lib/defaults.ts`.

---

## 4. Folder structure

```
foh-billing/
├─ public/
│  ├─ assets/logo.png, seal.png        your images
│  └─ fonts/                           Open Sans, DM Sans, Noto Sans Arabic (.ttf)
├─ sample-data/sample-backup.json      test data to import
├─ src/
│  ├─ app/                             pages (Next.js App Router)
│  │  ├─ layout.tsx                    nav bar + page frame
│  │  ├─ globals.css                   Tailwind
│  │  ├─ page.tsx                      /            dashboard
│  │  ├─ new/page.tsx                  /new         create (or ?from=id to duplicate)
│  │  ├─ documents/page.tsx            /documents   history, search, filters
│  │  ├─ documents/[id]/page.tsx       /documents/x view / edit / re-download
│  │  ├─ clients/page.tsx              /clients
│  │  └─ settings/page.tsx             /settings    + logo/seal + backup
│  ├─ components/
│  │  ├─ DocumentEditor.tsx            main form, totals, actions
│  │  ├─ LineItemsEditor.tsx           add/edit/delete/reorder rows
│  │  ├─ PdfPreview.tsx                live preview iframe
│  │  ├─ Nav.tsx, StatusBadge.tsx, ui.tsx
│  └─ lib/
│     ├─ types.ts                      data shapes
│     ├─ schema.ts                     Zod validation rules
│     ├─ defaults.ts                   your business details (TODOs here)
│     ├─ calc.ts                       all money maths
│     ├─ numberToWords.ts              amount in words
│     ├─ format.ts                     dates, money, ids
│     ├─ docActions.ts                 duplicate, convert, overdue
│     ├─ backup.ts                     export/import JSON
│     ├─ useSettings.ts
│     ├─ storage/
│     │  ├─ repository.ts              the storage "contract" (interface)
│     │  ├─ indexeddb.ts               browser implementation
│     │  └─ index.ts                   ← switch storage here
│     └─ pdf/
│        ├─ fonts.ts                   font registration (+ Arabic)
│        ├─ shared.tsx                 colours, helpers
│        ├─ InvoicePdf.tsx             TAX INVOICE template
│        ├─ QuotationPdf.tsx           QUOTATION template
│        └─ generate.ts                build/download the PDF
└─ next.config.ts, eslint.config.mjs, tsconfig.json, package.json
```

---

## 5. Features
| Feature | Where |
|---|---|
| Invoice / Quotation switch | Toggle at the top of `/new` (before first save) |
| Auto numbers INV-0001 / QT-0001, editable next number | Settings → Tax, currency & numbering (blocks numbers already used) |
| Saved clients + picker | `/clients`, or "Save to client list" in the form |
| Line items with reorder | ↑ ↓ ✕ buttons on each item |
| Discount (amount or %), VAT, live totals | Totals card |
| Amount in words | AED → "Dirhams / Fils", also USD, EUR, GBP, SAR, INR, OMR, QAR |
| Live preview + download | Right column (desktop) / Preview tab (mobile) |
| Seal toggle per document | Notes, terms & seal card |
| History, search, filters, edit, duplicate, delete, re-download | `/documents` |
| Status tracking | Invoices: Draft/Sent/Paid/Overdue (Sent past due date shows Overdue automatically). Quotes: Draft/Sent/Accepted/Rejected |
| Convert quotation → invoice | "Convert to invoice" button on a saved quotation |
| Backup / restore | Settings → Backup & restore |

---

## 6. Sample test data
- Import `sample-data/sample-backup.json` (Settings → Import). It contains 2 clients, 1 accepted quotation, 1 paid invoice and 1 overdue invoice with a 10% discount.
- Or type by hand: client **ALLIED ENERGY - L.L.C**, TRN `105187144800003`, item "Videography With Editing - ADIPEC 2026", Qty 1, Unit "Crew", Price 700, VAT 5% → total **735.00**, "Seven Hundred Thirty Five Dirhams Only".
- Multi-page test: add ~20 items; the table continues on page 2 with its header repeated.

---

## 7. Deploy to Vercel (free)
1. Create a free account at <https://github.com> and <https://vercel.com> (sign in with GitHub).
2. Create a new **empty** GitHub repository, e.g. `foh-billing`.
3. In the project folder (git was already initialised by create-next-app):
   ```bash
   git add .
   git commit -m "FOH billing app"
   git branch -M main
   git remote add origin https://github.com/<your-username>/foh-billing.git
   git push -u origin main
   ```
4. On Vercel: **Add New → Project → Import** your repository → keep the defaults → **Deploy**.
5. After ~1 minute you get a URL like `https://foh-billing.vercel.app`.
6. Every `git push` redeploys automatically.

> **Data note:** data stays in each browser. Data on `localhost:3000` is **not** copied to your Vercel site. Use Export backup → Import backup to move it.

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| Preview says "Could not build the PDF" after uploading a logo | Only PNG/JPG work in PDFs. Convert SVG/WebP/HEIC to PNG. Click "Use default file" to go back. |
| Logo/seal missing in PDF | Check the files exist at `public/assets/logo.png` and `seal.png` (lower-case names). Restart `npm run dev`. |
| Text in PDF spreads out with big gaps | In react-pdf, always set `fontSize` next to a unitless `lineHeight` in the same style. |
| "Unknown font format" / font error | Fonts must be `.ttf` (or `.otf`) files in `public/fonts`; names must match `src/lib/pdf/fonts.ts`. |
| Arabic letters show as boxes | Make sure `NotoSansArabic-400.ttf` / `-700.ttf` exist. Mixed Arabic + English on one line may show words in the wrong order (a react-pdf limitation). Put Arabic on its own line, e.g. in the address. |
| Preview is blank on phone | Mobile browsers often can't show a PDF in a page. Use **Open in new tab** or download it. |
| "Hydration failed" error | Never read IndexedDB, `window` or `new Date()` while rendering. Do it in `useEffect` (all pages already do). |
| Build error "usePathname/useSearchParams outside `<Suspense>`" | Wrap the component in `<Suspense>` (see `layout.tsx` and `new/page.tsx`). |
| Data disappeared | Browser data was cleared, or you're in a private window / different browser / different URL. Restore from a backup. |
| Number already used | Settings won't let you set the next number to one that exists. Choose a higher number. |
| `npm run dev` says port 3000 in use | Run `npm run dev -- -p 3001`. |

---

## 9. Future improvements
- **Login + cloud database:** Supabase (free tier) with Auth. Write `src/lib/storage/supabase.ts` implementing the `Repository` interface, then change one line in `storage/index.ts`. Tables = the types in `types.ts`.
- **Prisma + SQLite/Postgres:** same idea, behind Next.js Route Handlers.
- **Email sending:** Resend (free tier) from a Route Handler, attaching the PDF blob.
- **Recurring invoices:** add `recurrence` to `AppDocument` and a "generate due recurring" button (or a Vercel Cron job once there is a server DB).
- **Multi-currency:** currency is already per document; add exchange rates and per-currency dashboard totals.
- **Payments:** record partial payments; balance due on the invoice.
- **Credit notes / receipts:** new `DocType`s using the same template system.
#   F O H _ B i l l i n g  
 