/**
 * Generates an RFC 4122 v4 UUID.
 *
 * Uses `crypto.randomUUID()` when available, with a `getRandomValues()` fallback
 * for non-secure contexts — `crypto.randomUUID` only exists over HTTPS or on
 * localhost, so it is undefined when the app is opened via a LAN IP like
 * `http://192.168.x.x`. `crypto.getRandomValues()` is available everywhere.
 */
export function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return (
    `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-` +
    `${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-` +
    `${hex.slice(10, 16).join("")}`
  );
}
