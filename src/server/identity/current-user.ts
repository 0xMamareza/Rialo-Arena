import "server-only";

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import {
  resolveSessionToken,
  SESSION_COOKIE_NAME,
} from "./session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return resolveSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export function getCurrentUserFromRequest(request: NextRequest) {
  return resolveSessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}