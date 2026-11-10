/**
 * numberToWords.ts — 735.5 + "AED" -> "Seven Hundred Thirty Five Dirhams and Fifty Fils Only"
 */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const SCALES = ["", "Thousand", "Million", "Billion", "Trillion"];

/** Words for 0..999 */
function hundreds(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ""));
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" ");
}

/** Words for any whole number. */
export function integerToWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "Zero";
  const groups: string[] = [];
  let scale = 0;
  while (n > 0 && scale < SCALES.length) {
    const chunk = n % 1000;
    if (chunk) groups.unshift(`${hundreds(chunk)}${SCALES[scale] ? " " + SCALES[scale] : ""}`);
    n = Math.floor(n / 1000);
    scale++;
  }
  return groups.join(" ");
}

/** Currency names: [main plural, main singular, fraction name] */
const CURRENCY_WORDS: Record<string, [string, string, string]> = {
  AED: ["Dirhams", "Dirham", "Fils"],
  USD: ["US Dollars", "US Dollar", "Cents"],
  EUR: ["Euros", "Euro", "Cents"],
  GBP: ["Pounds", "Pound", "Pence"],
  SAR: ["Saudi Riyals", "Saudi Riyal", "Halalas"],
  INR: ["Rupees", "Rupee", "Paise"],
  OMR: ["Omani Rials", "Omani Rial", "Baisa"],
  QAR: ["Qatari Riyals", "Qatari Riyal", "Dirhams"],
};

export function amountToWords(amount: number, currency = "AED"): string {
  const value = Math.round((Number.isFinite(amount) ? Math.abs(amount) : 0) * 100);
  const whole = Math.floor(value / 100);
  const fraction = value % 100;
  const [plural, singular, fractionName] = CURRENCY_WORDS[currency] ?? [currency, currency, "Cents"];

  let text = `${integerToWords(whole)} ${whole === 1 ? singular : plural}`;
  if (fraction > 0) text += ` and ${integerToWords(fraction)} ${fractionName}`;
  return `${text} Only`;
}
