/**
 * QuotationPdf.tsx — rebuilds your QUOTATION.pdf design, in black and white only.
 *
 * Measurements: your sample is A4 (595 x 842 points). Numbers below are points.
 *   - black "QUOTATION" bar top-left, logo top-right
 *   - "From:" block, Date, "Prepared for," + client name
 *   - black table header (Sl No. | Description | Quantity | Total) with black borders
 *   - black "TOTAL AMOUNT" bar
 *   - TERMS AND CONDITIONS bullets, seal + "Authorized By"
 */
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { lineAmount, VAT_RATE } from "../calc";
import { formatDateLong, money } from "../format";
import { BODY_FONT, ACCENT_FONT } from "./fonts";
import { lines, qtyLabel, type PdfProps } from "./shared";

const PAGE_X = 27; // left/right margin

// Black and white only.
const BLACK = "#000000";
const WHITE = "#FFFFFF";

const s = StyleSheet.create({
  page: {
    fontFamily: BODY_FONT,
    fontSize: 10,
    color: BLACK,
    backgroundColor: WHITE,
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: PAGE_X,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between" },
  bar: { marginLeft: -PAGE_X, marginTop: 8, width: 227, height: 28, backgroundColor: BLACK, position: "relative" },
  barText: {
    position: "absolute",
    left: 49,
    top: 1,
    fontSize: 22,
    fontWeight: 700,
    color: WHITE,
    letterSpacing: 0.3,
  },
  logo: { width: 164, marginTop: 28, objectFit: "contain" },
  // NOTE: always give a fontSize next to a unitless lineHeight in react-pdf,
  // otherwise it is multiplied by the default 18pt and lines spread apart.
  fromBlock: { marginTop: 32, fontSize: 10, lineHeight: 1.35 },
  date: { marginTop: 40 },
  preparedFor: { marginTop: 40, fontFamily: ACCENT_FONT, fontSize: 11 },
  clientName: { fontFamily: ACCENT_FONT, fontSize: 11, fontWeight: 700, marginTop: 2 },
  clientExtra: { fontSize: 8.5, color: BLACK, marginTop: 1 },

  table: { marginTop: 12 },
  row: { flexDirection: "row" },
  th: {
    backgroundColor: BLACK,
    color: WHITE,
    fontWeight: 700,
    fontSize: 11,
    paddingVertical: 4,
    textAlign: "center",
    borderRightWidth: 1.5,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: BLACK,
  },
  td: {
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: BLACK,
    paddingHorizontal: 4,
    paddingVertical: 8,
    justifyContent: "center",
  },
  first: { borderLeftWidth: 1.5 },
  colNo: { width: 44, textAlign: "center" },
  colQty: { width: 87, textAlign: "center" },
  colPrice: { width: 80, textAlign: "center" },
  colTotal: { width: 87, textAlign: "center" },
  colDesc: { flex: 1 },
  itemTitle: { fontFamily: ACCENT_FONT, fontSize: 11, fontWeight: 700 },
  itemDesc: { fontSize: 9, marginTop: 1 },
  cellCenter: { textAlign: "center", fontFamily: ACCENT_FONT, fontSize: 9.5 },
  cellMoney: { textAlign: "center", fontFamily: ACCENT_FONT, fontSize: 12 },

  summaryLabel: { flex: 1, textAlign: "right", fontWeight: 600, fontSize: 9.5 },
  totalBar: { backgroundColor: BLACK, color: WHITE },
  totalLabel: { flex: 1, textAlign: "right", fontWeight: 700, fontSize: 11.5 },
  totalValue: { textAlign: "center", fontWeight: 700, fontSize: 12 },

  words: { marginTop: 8, fontSize: 9 },
  sectionTitle: { fontWeight: 700, fontSize: 9, marginBottom: 3 },
  notes: { marginTop: 24, fontSize: 8.5, lineHeight: 1.35 },
  terms: { marginTop: 60 },
  bulletRow: { flexDirection: "row", fontSize: 7.5, marginBottom: 1.5, paddingLeft: 6 },
  bullet: { width: 10 },

  signature: { marginTop: 34, width: 200 },
  seal: { width: 128, transform: "rotate(-6deg)", marginLeft: 2, marginBottom: 4 },
  sealSpace: { height: 62 },
  authorized: { fontFamily: ACCENT_FONT, fontWeight: 700, fontSize: 10, lineHeight: 1.4 },

  miniHeader: {
    position: "absolute",
    top: 16,
    left: PAGE_X,
    right: PAGE_X,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  miniLogo: { width: 70 },
  pageNumber: { position: "absolute", bottom: 20, right: PAGE_X, fontSize: 8, color: BLACK },
});

export function QuotationPdf({ doc, settings, totals, amountInWords, logoSrc, sealSrc }: PdfProps) {
  const b = settings.business;
  const showPrice = settings.quotationShowUnitPrice;
  const cur = doc.currency;
  // One item in your sample = a tall row. Many items = compact rows.
  const rowMinHeight = doc.items.length <= 2 ? 85 : 40;
  const hasSummary = totals.discount > 0 || totals.tax > 0;

  return (
    <Document title={`${doc.number || "Quotation"} - ${doc.client.name}`} author={b.name}>
      <Page size="A4" style={s.page}>
        {/* Small header on page 2, 3, ... (fixed = repeats on every page) */}
        <View
          fixed
          style={s.miniHeader}
          render={({ pageNumber }) =>
            pageNumber > 1 ? (
              <>
                <Text style={{ fontSize: 8, color: BLACK }}>
                  Quotation {doc.number} (continued)
                </Text>
                <Image src={logoSrc} style={s.miniLogo} />
              </>
            ) : null
          }
        />

        {/* ===== Header ===== */}
        <View style={s.headerRow}>
          <View>
            <View style={s.bar}>
              <Text style={s.barText}>QUOTATION</Text>
            </View>

            <View style={s.fromBlock}>
              <Text>From:</Text>
              <Text>{b.name.replace(/\s*-\s*L\.L\.C$/i, "")}</Text>
              {lines(b.address).map((l, i) => (
                <Text key={i}>{l}</Text>
              ))}
              {b.phone ? <Text>Phone: {b.phone}</Text> : null}
              {b.email2 ? <Text>{b.email2}</Text> : null}
              {b.email ? <Text>{b.email}</Text> : null}
              {b.website ? <Text>{b.website}</Text> : null}
            </View>
          </View>
          <Image src={logoSrc} style={s.logo} />
        </View>

        <Text style={s.date}>
          Date: {formatDateLong(doc.issueDate)}
          {doc.validUntil ? `      Valid until: ${formatDateLong(doc.validUntil)}` : ""}
        </Text>
        {doc.number ? <Text style={{ marginTop: 2 }}>Quotation No: {doc.number}</Text> : null}

        <Text style={s.preparedFor}>Prepared for,</Text>
        <Text style={s.clientName}>{doc.client.name}</Text>
        {lines(doc.client.address).map((l, i) => (
          <Text key={i} style={s.clientExtra}>{l}</Text>
        ))}
        {doc.client.taxNumber ? <Text style={s.clientExtra}>TRN: {doc.client.taxNumber}</Text> : null}

        {/* ===== Items table ===== */}
        <View style={s.table}>
          {/* fixed => header row is repeated when the table continues on a new page */}
          <View style={s.row} fixed>
            <Text style={[s.th, s.first, s.colNo]}>Sl No.</Text>
            <Text style={[s.th, s.colDesc]}>Description</Text>
            <Text style={[s.th, s.colQty]}>Quantity</Text>
            {showPrice ? <Text style={[s.th, s.colPrice]}>Unit Price</Text> : null}
            <Text style={[s.th, s.colTotal]}>Total</Text>
          </View>

          {doc.items.map((item, i) => (
            // wrap={false} => a row is never cut in half between pages
            <View key={item.id} style={[s.row, { minHeight: rowMinHeight }]} wrap={false}>
              <View style={[s.td, s.first, s.colNo]}>
                <Text style={{ textAlign: "center" }}>{i + 1}</Text>
              </View>
              <View style={[s.td, s.colDesc]}>
                {item.title ? <Text style={s.itemTitle}>{item.title}</Text> : null}
                {item.description ? <Text style={s.itemDesc}>{item.description}</Text> : null}
              </View>
              <View style={[s.td, s.colQty]}>
                <Text style={s.cellCenter}>{qtyLabel(item.quantity, item.unit)}</Text>
              </View>
              {showPrice ? (
                <View style={[s.td, s.colPrice]}>
                  <Text style={s.cellCenter}>{money(item.unitPrice)}</Text>
                </View>
              ) : null}
              <View style={[s.td, s.colTotal]}>
                <Text style={s.cellMoney}>{money(lineAmount(item))}</Text>
              </View>
            </View>
          ))}

          {/* Optional rows: only shown when there is a discount or VAT */}
          {hasSummary ? (
            <View wrap={false}>
              <SummaryRow label="SUB TOTAL" value={money(totals.subtotal)} />
              {totals.discount > 0 ? (
                <SummaryRow
                  label={`DISCOUNT${doc.discountType === "percent" ? ` (${doc.discountValue}%)` : ""}`}
                  value={`- ${money(totals.discount)}`}
                />
              ) : null}
              {totals.tax > 0 ? <SummaryRow label={`VAT (${VAT_RATE}%)`} value={money(totals.tax)} /> : null}
            </View>
          ) : null}

          <View style={[s.row, { minHeight: 34 }]} wrap={false}>
            <View style={[s.td, s.first, s.totalBar, { flex: 1 }]}>
              <Text style={s.totalLabel}>TOTAL AMOUNT</Text>
            </View>
            <View style={[s.td, s.totalBar, s.colTotal]}>
              <Text style={s.totalValue}>
                {money(totals.total)} {cur}
              </Text>
            </View>
          </View>
        </View>

        <Text style={s.words}>
          <Text style={{ fontWeight: 700 }}>Amount in words: </Text>
          {amountInWords}
        </Text>

        {doc.notes ? (
          <View style={s.notes} wrap={false}>
            <Text style={s.sectionTitle}>NOTES</Text>
            <Text>{doc.notes}</Text>
          </View>
        ) : null}

        {/* ===== Terms ===== */}
        {lines(doc.terms).length ? (
          <View style={s.terms} wrap={false}>
            <Text style={s.sectionTitle}>TERMS AND CONDITIONS</Text>
            {lines(doc.terms).map((t, i) => (
              <View key={i} style={s.bulletRow}>
                <Text style={s.bullet}>•</Text>
                <Text style={{ flex: 1 }}>{t}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ===== Seal + signature (end of document) ===== */}
        <View style={s.signature} wrap={false}>
          {doc.showSeal ? <Image src={sealSrc} style={s.seal} /> : <View style={s.sealSpace} />}
          <Text style={s.authorized}>Authorized By</Text>
          <Text style={s.authorized}>{settings.signatoryName || b.name}</Text>
          {settings.signatoryTitle ? (
            <Text style={{ fontSize: 9, fontFamily: ACCENT_FONT }}>{settings.signatoryTitle}</Text>
          ) : null}
        </View>

        {/* Page numbers — only when there is more than one page (your sample has none) */}
        <Text
          fixed
          style={s.pageNumber}
          render={({ pageNumber, totalPages }) => (totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : "")}
        />
      </Page>
    </Document>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <View style={[s.td, s.first, { flex: 1, paddingVertical: 4 }]}>
        <Text style={s.summaryLabel}>{label}</Text>
      </View>
      <View style={[s.td, s.colTotal, { paddingVertical: 4 }]}>
        <Text style={[s.cellCenter, { fontSize: 10 }]}>{value}</Text>
      </View>
    </View>
  );
}
