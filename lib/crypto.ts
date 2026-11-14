/** Web Crypto helpers (Cloudflare Workers + Node 20+). */
const enc = new TextEncoder();

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 32): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Detect real file type from magic bytes (never trust the browser-provided MIME type). */
export function sniffMime(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | "application/pdf" | null {
  const h = (i: number) => bytes[i];
  if (bytes.length > 3 && h(0) === 0xff && h(1) === 0xd8 && h(2) === 0xff) return "image/jpeg";
  if (bytes.length > 8 && h(0) === 0x89 && h(1) === 0x50 && h(2) === 0x4e && h(3) === 0x47) return "image/png";
  if (bytes.length > 12 && h(0) === 0x52 && h(1) === 0x49 && h(2) === 0x46 && h(3) === 0x46 && h(8) === 0x57 && h(9) === 0x45 && h(10) === 0x42 && h(11) === 0x50) return "image/webp";
  if (bytes.length > 4 && h(0) === 0x25 && h(1) === 0x50 && h(2) === 0x44 && h(3) === 0x46) return "application/pdf";
  return null;
}
