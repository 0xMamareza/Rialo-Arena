import "server-only";

import { NextResponse, type NextRequest } from "next/server";

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

/**
 * Browser mutations must include an Origin that exactly matches the request
 * origin. Non-browser callers must opt in by sending the same explicit Origin.
 */
export function validateMutationOrigin(request: NextRequest) {
  const originHeader = request.headers.get("origin");

  if (!originHeader) {
    return forbiddenOriginResponse();
  }

  try {
    if (new URL(originHeader).origin !== request.nextUrl.origin) {
      return forbiddenOriginResponse();
    }
  } catch {
    return forbiddenOriginResponse();
  }

  return null;
}
