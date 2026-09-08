import { randomBytes, randomUUID } from "node:crypto";

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"; // base32-ish, no look-alikes

// Short, URL-shareable id for trips. ~10 chars of crypto-random.
export function tripId(length = 10): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

// Opaque ids for participants and proposals — not user-visible.
export function opaqueId(): string {
  return randomUUID();
}
