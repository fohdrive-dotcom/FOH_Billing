/**
 * InvoicePdf.tsx — rebuilds your INVOICE.pdf (TAX INVOICE) design.
 *
 *   - logo top-left, "TAX INVOICE / Invoice No. / Date" top-right
 *   - company block with TRN, "Bill To" block
 *   - faint logo watermark behind the table
 *   - dynamic table: No of Crew, optional No of Days, Unit Price,
 *     optional VAT columns (hidden when taxRate = 0)
 *   - totals on the right, amount in words on the left
 *   - Terms, Bank Details, "Received by" + seal + "FOR <COMPANY>"
 *   - footer: phone / email + tagline bar (repeats on every page)
 */
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { lineAmount, round2 } from "../calc";
import { formatDateShort, money } from "../format";
import { BODY_FONT, ACCENT_FONT } from "./fonts";
import { COLORS, lines, type PdfProps } from "./shared";

const PAGE_X = 20;
const BORDER = 1.2;

const s = StyleSheet.create({
  page: {
    fontFamily: BODY_FONT,
    fontSize: 9.5,
    color: COLORS.text,
    paddingTop: 55,
    paddingBottom: 80, // room for the fixed footer
    paddingHorizontal: PAGE_X,
  },
  watermark: { position: "absolute", top: 290, left: 130, width: 335, opacity: 0.045 },

  headerRow: { flexDirection: "row", justifyContent: "space-between" },
  logo: { width: 134, objectFit: "contain" },
  metaBlock: { width: 160, marginRight: 18, paddingTop: 50 },
  metaTitle: { fontWeight: 700, fontSize: 9.5, marginBottom: 10 },
  metaLine: { fontSize: 9.5, lineHeight: 1.45 },

  company: { marginTop: 22, lineHeight: 1.3, fontSize: 9.5 },
  billTo: { marginTop: 38, marginLeft: 5, fontSize: 9.5, lineHeight: 1.35 },
  bold: { fontWeight: 700 },
  billToExtra: { fontSize: 8.5, color: COLORS.muted },

  table: { marginTop: 30, marginHorizontal: 1 },
  row: { flexDirection: "row" },
  th: {
    fontWeight: 700,
    fontSize: 10,
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderRightWidth: BORDER,
    borderTopWidth: BORDER,
    borderBottomWidth: BORDER,
    borderColor: COLORS.border,
    textAlign: "center",
    backgroundColor: "#FFFFFF",
  },
  td: {
    borderRightWidth: BORDER,
    borderBottomWidth: BORDER,
    borderColor: COLORS.border,
    paddingHorizontal: 3,
    paddingVertical: 5,
    justifyContent: "center",
  },
  first: { borderLeftWidth: BORDER },
  colNo: { width: 41, textAlign: "center" },
  colDesc: { flex: 1, textAlign: "left" },
  colCrew: { width: 55, textAlign: "center" },
  colDays: { width: 50, textAlign: "center" },
  colPrice: { width: 66, textAlign: "center" },
  colVat: { width: 48, textAlign: "center" },
  colVatAmt: { width: 60, textAlign: "center" },
  colTotal: { width: 66, textAlign: "center" },
  center: { textAlign: "center" },
  itemTitle: { fontWeight: 700 },

  totalsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  words: { width: 290, paddingTop: 22 },
  wordsLabel: { fontFamily: ACCENT_FONT, fontWeight: 700, fontSize: 8.5, marginBottom: 4 },
  wordsText: { fontFamily: ACCENT_FONT, fontWeight: 700, fontSize: 9 },
  summary: { alignItems: "flex-end", marginRight: 14 },
  summaryLine: { fontFamily: ACCENT_FONT, fontSize: 8, marginBottom: 4 },
  grandTotal: { fontFamily: ACCENT_FONT, fontSize: 9.5, fontWeight: 700 },

  sectionTitle: { fontWeight: 700, fontSize: 9, marginBottom: 2 },
  block: { marginTop: 26 },

  bottomRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 26 },
  bankTitle: { fontFamily: ACCENT_FONT, fontWeight: 700, fontSize: 10, marginBottom: 3 },
  bankLine: { fontFamily: ACCENT_FONT, fontSize: 8, letterSpacing: 0.7, color: COLORS.muted, lineHeight: 1.35 },
  receivedBy: { fontFamily: ACCENT_FONT, fontWeight: 700, fontSize: 9, marginTop: 40, marginLeft: 8 },
  sealCol: { width: 210, alignItems: "center", justifyContent: "flex-end" },
  seal: { width: 150, transform: "rotate(-6deg)", marginBottom: 2 },
  sealSpace: { height: 70 },
  forCompany: { fontFamily: ACCENT_FONT, fontWeight: 700, fontSize: 8.5, marginTop: 30 },
  signatory: { fontFamily: ACCENT_FONT, fontSize: 8, marginTop: 2 },

  footer: { position: "absolute", left: PAGE_X, right: PAGE_X, bottom: 8 },
  footerContacts: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    marginBottom: 9,
    paddingHorizontal: 0,
  },
  tagline: {
    borderLeftWidth: 0.8,
    borderLeftColor: "#555555",
    backgroundColor: "#FAFAFA",
    marginHorizontal: 50,
    paddingVertical: 2,
    fontFamily: ACCENT_FONT,
    fontWeight: 700,
    fontSize: 10.5,
    letterSpacing: 2,
    textAlign: "center",
  },
  pageNumber: { fontSize: 7.5, color: "#666666", textAlign: "center" },

  miniHeader: {
    position: "absolute",
    top: 16,
    left: PAGE_X,
    right: PAGE_X,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

export function InvoicePdf({ doc, settings, totals, amountInWords, logoSrc, sealSrc }: PdfProps) {
  const b = settings.business;
  const bank = settings.bank;
  const cur = doc.currency;
  const taxRate = doc.taxRate ?? 0;
  const hasVat = taxRate > 0;
  const showDays = doc.showDays ?? false;
  const isTaxInvoice = hasVat;
  const rowMinHeight = doc.items.length <= 2 ? 38 : 26;

  const bankLines = [
    bank.beneficiary && `Beneficiary Name: ${bank.beneficiary}`,
    bank.bankName && `Bank Name: ${bank.bankName}`,
    bank.branch && `Branch: ${bank.branch}`,
    bank.accountNumber && `Account Number: ${bank.accountNumber}`,
    bank.iban && `IBAN: ${bank.iban}`,
    bank.swift && `SWIFT: ${bank.swift}`,
    `Currency: ${cur}`,
  ].filter(Boolean) as string[];

  return (
    <Document title={`${doc.number || "Invoice"} - ${doc.client.name}`} author={b.name}>
      <Page size="A4" style={s.page}>
        {/* Faint logo watermark on every page */}
        <Image fixed src={logoSrc} style={s.watermark} />

        {/* Small header on page 2, 3, ... */}
        <View
          fixed
          style={s.miniHeader}
          render={({ pageNumber }) =>
            pageNumber > 1 ? (
              <>
                <Image src={logoSrc} style={{ width: 70 }} />
                <Text style={{ fontSize: 8, color: "#666666" }}>
                  Invoice No. : {doc.number} (continued)
                </Text>
              </>
            ) : null
          }
        />

        {/* ===== Header ===== */}
        <View style={s.headerRow}>
          <Image src={logoSrc} style={s.logo} />
          <View style={s.metaBlock}>
            <Text style={s.metaTitle}>{isTaxInvoice ? "TAX INVOICE" : "INVOICE"}</Text>
            <Text style={s.metaLine}>Invoice No. : {doc.number || "(assigned on save)"}</Text>
            <Text style={s.metaLine}>Date : {formatDateShort(doc.issueDate)}</Text>
            {doc.dueDate && doc.dueDate !== doc.issueDate ? (
              <Text style={s.metaLine}>Due Date : {formatDateShort(doc.dueDate)}</Text>
            ) : null}
          </View>
        </View>

        <View style={s.company}>
          <Text>{b.name}</Text>
          {lines(b.address).map((l, i) => (
            <Text key={i}>{l}</Text>
          ))}
          {b.taxNumber ? <Text>TRN : {b.taxNumber}</Text> : null}
          {b.phone ? <Text>Phone : {b.phone.replace(/\s*\/\s*/g, " ")}</Text> : null}
          {b.email ? <Text>Email : {b.email}</Text> : null}
        </View>

        <View style={s.billTo}>
          <Text style={s.bold}>Bill To :</Text>
          <Text style={s.bold}>{doc.client.name}</Text>
          {doc.client.taxNumber ? <Text style={s.bold}>TRN : {doc.client.taxNumber}</Text> : null}
          {lines(doc.client.address).map((l, i) => (
            <Text key={i} style={s.billToExtra}>{l}</Text>
          ))}
          {doc.client.phone ? <Text style={s.billToExtra}>Phone : {doc.client.phone}</Text> : null}
          {doc.client.email ? <Text style={s.billToExtra}>Email : {doc.client.email}</Text> : null}
        </View>

        {/* ===== Items table ===== */}
        <View style={s.table}>
          <View style={s.row} fixed>
            <Text style={[s.th, s.first, s.colNo]}>Sl No.</Text>
            <Text style={[s.th, s.colDesc]}>Description</Text>
            <Text style={[s.th, s.colCrew]}>No of{"\n"}Crew</Text>
            {showDays ? <Text style={[s.th, s.colDays]}>No of{"\n"}Days</Text> : null}
            <Text style={[s.th, s.colPrice]}>Unit Price</Text>
            {hasVat ? <Text style={[s.th, s.colVat]}>VAT{"\n"}{taxRate}%</Text> : null}
            {hasVat ? <Text style={[s.th, s.colVatAmt]}>Total{"\n"}VAT</Text> : null}
            <Text style={[s.th, s.colTotal]}>{hasVat ? "Total" : "Amount"}</Text>
          </View>

          {doc.items.map((item, i) => {
            const base = lineAmount({ ...item, days: showDays ? (item.days ?? 1) : undefined });
            const vat = hasVat ? round2((base * taxRate) / 100) : 0;
            return (
              <View key={item.id} style={[s.row, { minHeight: rowMinHeight }]} wrap={false}>
                <View style={[s.td, s.first, s.colNo]}>
                  <Text style={s.center}>{i + 1}</Text>
                </View>
                <View style={[s.td, s.colDesc]}>
                  {item.title ? <Text style={s.itemTitle}>{item.title}</Text> : null}
                  {item.description ? <Text>{item.description}</Text> : null}
                </View>
                <View style={[s.td, s.colCrew]}>
                  <Text style={s.center}>{item.quantity}</Text>
                </View>
                {showDays ? (
                  <View style={[s.td, s.colDays]}>
                    <Text style={s.center}>{item.days ?? 1}</Text>
                  </View>
                ) : null}
                <View style={[s.td, s.colPrice]}>
                  <Text style={s.center}>{money(item.unitPrice)}</Text>
                </View>
                {hasVat ? (
                  <View style={[s.td, s.colVat]}>
                    <Text style={s.center}>{taxRate}%</Text>
                  </View>
                ) : null}
                {hasVat ? (
                  <View style={[s.td, s.colVatAmt]}>
                    <Text style={s.center}>{money(vat)}</Text>
                  </View>
                ) : null}
                <View style={[s.td, s.colTotal]}>
                  <Text style={s.center}>{money(base + vat)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ===== Totals + amount in words ===== */}
        <View style={s.totalsRow} wrap={false}>
          <View style={s.words}>
            <Text style={s.wordsLabel}>Amount in words :</Text>
            <Text style={s.wordsText}>{amountInWords}</Text>
          </View>
          <View style={s.summary}>
            <Text style={s.summaryLine}>
              Sub Total{hasVat ? " Before VAT" : ""} ({cur}) : {money(totals.subtotal)}
            </Text>
            {totals.discount > 0 ? (
              <>
                <Text style={s.summaryLine}>
                  Discount{doc.discountType === "percent" ? ` ${doc.discountValue}%` : ""} ({cur}) : -
                  {money(totals.discount)}
                </Text>
                {hasVat ? (
                  <Text style={s.summaryLine}>
                    Taxable Amount ({cur}) : {money(totals.taxable)}
                  </Text>
                ) : null}
              </>
            ) : null}
            {hasVat ? (
              <Text style={s.summaryLine}>
                VAT {taxRate}% ({cur}) : {money(totals.tax)}
              </Text>
            ) : null}
            <Text style={s.grandTotal}>
              Grand Total ({cur}) : {money(totals.total)}
            </Text>
          </View>
        </View>

        {doc.notes ? (
          <View style={s.block} wrap={false}>
            <Text style={s.sectionTitle}>Notes</Text>
            <Text>{doc.notes}</Text>
          </View>
        ) : null}

        {lines(doc.terms).length ? (
          <View style={s.block} wrap={false}>
            <Text style={s.sectionTitle}>Terms & Condition</Text>
            {lines(doc.terms).map((t, i) => (
              <Text key={i}>{t}</Text>
            ))}
          </View>
        ) : null}

        {/* ===== Bank details (left) + seal (right) ===== */}
        <View style={s.bottomRow} wrap={false}>
          <View>
            <Text style={s.bankTitle}>Bank Details</Text>
            {bankLines.map((l, i) => (
              <Text key={i} style={s.bankLine}>{l}</Text>
            ))}
            <Text style={s.receivedBy}>Received by :</Text>
          </View>
          <View style={s.sealCol}>
            {doc.showSeal ? <Image src={sealSrc} style={s.seal} /> : <View style={s.sealSpace} />}
            <Text style={[s.forCompany, doc.showSeal ? { marginTop: 18 } : {}]}>
              FOR {b.name.toUpperCase().replace(/\s*-\s*L\.L\.C/, " L.L.C")}
            </Text>
            {settings.signatoryTitle ? (
              <Text style={s.signatory}>
                {settings.signatoryName} — {settings.signatoryTitle}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ===== Footer (repeats on every page) ===== */}
        <View fixed style={s.footer}>
          <View style={s.footerContacts}>
            <Text>Phone : {b.phone}</Text>
            <Text
              style={s.pageNumber}
              render={({ pageNumber, totalPages }) =>
                totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : ""
              }
            />
            <Text>Email : {b.email}</Text>
          </View>
          {b.tagline ? <Text style={s.tagline}>{b.tagline}</Text> : null}
        </View>
      </Page>
    </Document>
  );
}
