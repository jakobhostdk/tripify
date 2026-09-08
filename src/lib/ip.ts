import { headers } from "next/headers";

// Extract the originating client IP from forwarding headers.
// In production the app sits behind Caddy → x-forwarded-for will be the source of truth.
// Falls back to x-real-ip, then a sentinel that still groups together (so dev/local
// access still triggers the same-IP suggestion flow).
export async function getClientIp(): Promise<string> {
  const h = await headers();

  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    // Left-most entry is the original client; the rest are proxies.
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }

  const real = h.get("x-real-ip");
  if (real) return real.trim();

  return "unknown";
}
