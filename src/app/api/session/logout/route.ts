import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  getSessionCookieOptions,
  revokeSessionToken,
  SESSION_COOKIE_NAME,
} from "@/server/identity/session";

export async function POST() {
  const cookieStore = await cookies();
  const rawSessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  await revokeSessionToken(rawSessionToken);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(new Date(0)),
    maxAge: 0,
  });

  return response;
}
