import { headers } from "next/headers";

/**
 * True only for actual Chrome (not Chromium siblings that also send "Chrome/"
 * in their UA). We surface the extension download for these browsers since
 * the extension is currently MV3 + Chrome-targeted.
 */
export function isChromeUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  if (!/Chrome\/[\d.]+/.test(ua)) return false;
  // Chromium siblings — exclude.
  if (/Edg\//i.test(ua)) return false; // Microsoft Edge
  if (/OPR\//i.test(ua)) return false; // Opera
  if (/Brave\//i.test(ua)) return false;
  if (/SamsungBrowser\//i.test(ua)) return false;
  if (/YaBrowser\//i.test(ua)) return false;
  if (/Vivaldi\//i.test(ua)) return false;
  // Mobile Chrome on iOS reports CriOS — still "Chrome" but the extension
  // can't be installed there, so don't tease it.
  if (/CriOS\//i.test(ua)) return false;
  return true;
}

export async function detectChromeFromRequest(): Promise<boolean> {
  const h = await headers();
  return isChromeUserAgent(h.get("user-agent"));
}
