/**
 * A nationality, drawn as a flag.
 *
 * The code is ISO 3166-1 alpha-2 and everything else is derived from it, which
 * is the whole point of storing a code rather than a name and an image:
 *
 *   * The flag is the two regional-indicator characters for those letters. No
 *     image, no sprite sheet, no 250 SVGs to ship and keep current when a flag
 *     changes.
 *   * The name comes from `Intl.DisplayNames` in the reader's own language, so
 *     Czech reads "Německo" and English reads "Germany" without a single
 *     translation key. That is also why this component takes the locale: EN/CS
 *     parity here is the browser's job, not the translation file's.
 *
 * One honest limitation: Windows ships no flag glyphs, so a Windows browser
 * renders the two letters — "DE" rather than 🇩🇪. That is a legible nationality
 * rather than a broken box, the label underneath is the country's full name
 * either way, and the alternative was shipping a flag sprite to work around a
 * font gap. It degrades; it does not fail.
 */

const CODE = /^[A-Za-z]{2}$/;

/** Two letters to their regional-indicator pair. Anything else gets nothing. */
export function flagEmoji(code: string): string {
  if (!CODE.test(code)) return '';
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
  );
}

/**
 * The country's name in `locale`, falling back to the uppercase code.
 *
 * `Intl.DisplayNames` is missing on older engines and throws on an
 * unrecognised locale, so both are caught: a missing name is not a reason for
 * a friends list to fail to render.
 */
export function countryName(code: string, locale: string): string {
  const upper = code.toUpperCase();
  if (!CODE.test(code)) return '';
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(upper) ?? upper;
  } catch {
    return upper;
  }
}

export interface CountryFlagProps {
  /** ISO 3166-1 alpha-2. Null, empty or malformed renders nothing at all. */
  code: string | null | undefined;
  /** BCP 47 tag for the country name — the reader's language, not the flag's. */
  locale: string;
  /** Font size in px. The flag is a glyph, so it scales with type. */
  size?: number;
}

export function CountryFlag({ code, locale, size = 16 }: CountryFlagProps) {
  if (!code || !CODE.test(code)) return null;
  const emoji = flagEmoji(code);
  const name = countryName(code, locale);
  return (
    // role="img" with the country's name: a screen reader says "Germany", not
    // "regional indicator symbol letter D". The title gives a sighted reader
    // the same fact on hover, which matters when the glyph is two letters.
    <span className="ss-flag" role="img" aria-label={name} title={name} style={{ fontSize: `${size}px` }}>
      {emoji}
    </span>
  );
}

/**
 * Every ISO 3166-1 alpha-2 code, for the picker.
 *
 * Codes only — the names are resolved at render time in the reader's language,
 * so this list never needs translating and never goes stale in one language
 * while staying current in another. Sort by the resolved name, not by code:
 * alphabetical by code is alphabetical in no language at all.
 */
export const COUNTRY_CODES: readonly string[] = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ '
  + 'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO '
  + 'FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE '
  + 'JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO '
  + 'MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW '
  + 'PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM '
  + 'TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'
).split(' ');

/** The picker's options, named in `locale` and ordered the way that locale reads. */
export function countryOptions(locale: string): { code: string; name: string }[] {
  const collator = new Intl.Collator(locale);
  return COUNTRY_CODES
    .map((code) => ({ code, name: countryName(code, locale) }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

export default CountryFlag;
