/**
 * fonts.ts — tells @react-pdf/renderer where the font files are.
 *
 * Font files live in /public/fonts (downloaded from Google Fonts, free license).
 * Built-in PDF fonts (Helvetica) cannot show Arabic, so we add Noto Sans Arabic
 * as a FALLBACK: any Arabic letter is automatically drawn with it.
 */
import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerFonts() {
  if (registered) return;
  // Fonts are loaded by URL, so we need the full website address.
  const base = typeof window !== "undefined" ? window.location.origin : "";

  Font.register({
    family: "OpenSans",
    fonts: [
      { src: `${base}/fonts/OpenSans-400.ttf`, fontWeight: 400 },
      { src: `${base}/fonts/OpenSans-600.ttf`, fontWeight: 600 },
      { src: `${base}/fonts/OpenSans-700.ttf`, fontWeight: 700 },
    ],
  });
  Font.register({
    family: "DMSans",
    fonts: [
      { src: `${base}/fonts/DMSans-400.ttf`, fontWeight: 400 },
      { src: `${base}/fonts/DMSans-700.ttf`, fontWeight: 700 },
    ],
  });
  Font.register({
    family: "NotoSansArabic",
    fonts: [
      { src: `${base}/fonts/NotoSansArabic-400.ttf`, fontWeight: 400 },
      { src: `${base}/fonts/NotoSansArabic-700.ttf`, fontWeight: 700 },
    ],
  });

  // Stop react-pdf from splitting words with hyphens ("Videogra-phy").
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

/** Use these in styles: the 2nd font is used for characters the 1st one lacks (Arabic). */
export const BODY_FONT = ["OpenSans", "NotoSansArabic"];
export const ACCENT_FONT = ["DMSans", "NotoSansArabic"];
