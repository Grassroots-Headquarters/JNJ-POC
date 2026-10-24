/**
 * Normalise a phone number as a person typed it into the E.164 form Supabase
 * phone login expects (`+447700900123`).
 *
 * UK numbers may be typed with the trunk `0`, with `+44`, with `0044` or with
 * a bare `44`. Other countries are accepted only when written internationally
 * (`+` or `00` prefix). Returns `null` when the input is not a usable number.
 */
export function normalisePhone(input: string): string | null {
  const compact = input.replace(/[\s().-]/g, "");
  if (compact === "") return null;

  let international: string;
  if (compact.startsWith("+")) {
    international = compact.slice(1);
  } else if (compact.startsWith("00")) {
    international = compact.slice(2);
  } else if (compact.startsWith("0")) {
    international = `44${compact.slice(1)}`;
  } else if (compact.startsWith("44")) {
    international = compact;
  } else {
    return null;
  }

  if (!/^[1-9]\d{7,14}$/.test(international)) return null;
  if (international.startsWith("44") && international.length !== 12) return null;

  return `+${international}`;
}
