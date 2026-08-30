import "server-only";

import { isIP } from "node:net";

import type { NextRequest } from "next/server";

import { getTrustedProxyIpHeader } from "@/server/config/environment";

const UNAVAILABLE_CLIENT_IP = "unavailable";

function normalizeIp(candidate: string | null) {
  const value = candidate?.trim().toLowerCase();
  return value && isIP(value) !== 0 ? value : null;
}

export function getClientIpRateLimitKey(request: NextRequest) {
  const trustedHeader = getTrustedProxyIpHeader();
  const trustedClientIp = normalizeIp(request.headers.get(trustedHeader));

  return trustedClientIp ?? UNAVAILABLE_CLIENT_IP;
}

export { UNAVAILABLE_CLIENT_IP };
