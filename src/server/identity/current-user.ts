import "server-only";

import { cookies } from "next/headers";

import {
  resolveSessionToken,
  SESSION_COOKIE_NAME,
} from "./session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return resolveSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}
