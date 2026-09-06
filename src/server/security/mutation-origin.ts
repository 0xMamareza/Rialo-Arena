import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { normalizePublicSiteUrl } from "@/lib/config/public-site-url";
import { getPublicSiteUrlEnvironment } from "@/server/config/environment";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

function forbiddenOriginResponse() {
  return NextResponse.json(
    {
      error: {
        code: "ORIGIN_FORBIDDEN",
        message: "Request origin is not allowed.",
      },
    },
    {
      status: 403,
      headers: NO_STORE_HEADERS,
    },
  );
}

type EnvironmentSource = Record<string, string | undefined>;

function getAllowedMutationOrigin(
  request: NextRequest,
  source: EnvironmentSource,
) {
  if (source.NODE_ENV === "production") {
    return getPublicSiteUrlEnvironment(source);
  }

  return normalizePublicSiteUrl(request.nextUrl.origin);
}

/**
 * Browser mutations must include an Origin that exactly matches the configured
 * public origin in production or the request origin during local development.
 * Non-browser callers must opt in by sending the same explicit Origin.
 */
export function validateMutationOrigin(
  request: NextRequest,
  source: EnvironmentSource = process.env,
) {
  const originHeader = request.headers.get("origin");

  if (!originHeader) {
    return forbiddenOriginResponse();
  }

  try {
    const requestOrigin = normalizePublicSiteUrl(originHeader);
    const allowedOrigin = getAllowedMutationOrigin(request, source);

    if (requestOrigin !== allowedOrigin) {
      return forbiddenOriginResponse();
    }
  } catch {
    return forbiddenOriginResponse();
  }

  return null;
}
