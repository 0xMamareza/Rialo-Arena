import { NextResponse, type NextRequest } from "next/server";

import {
  getSessionCookieOptions,
  revokeSessionToken,
  SESSION_COOKIE_NAME,
} from "@/server/identity/session";
import { validateMutationOrigin } from "@/server/security/mutation-origin";

export async function POST(request: NextRequest) {
  const originRejection = validateMutationOrigin(request);

  if (originRejection) {
    return originRejection;
  }

  const rawSessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  await revokeSessionToken(rawSessionToken);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(new Date(0)),
    maxAge: 0,
  });

  return response;
}
