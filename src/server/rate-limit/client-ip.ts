import "server-only";

import { isIP } from "node:net";

import type { NextRequest } from "next/server";

const UNAVAILABLE_CLIENT_IP = "unavailable";

function normalizeIp(candidate: string | null) {
  const value = candidate?.trim().toLowerCase();
  return value && isIP(value) !== 0 ? value : null;
}

/**
 * Deployment assumption: the trusted edge proxy removes client-supplied
 * forwarding headers and writes x-forwarded-for or x-real-ip itself. The first
 * x-forwarded-for value is treated as the original client. Without a valid
 * trusted header, requests share one conservative fallback bucket.
 */
export function getClientIpRateLimitKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwardedIp = normalizeIp(forwardedFor?.split(",", 1)[0] ?? null);

  return firstForwardedIp
    ?? normalizeIp(request.headers.get("x-real-ip"))
    ?? UNAVAILABLE_CLIENT_IP;
}
