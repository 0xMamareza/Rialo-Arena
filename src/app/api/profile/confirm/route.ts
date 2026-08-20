import { NextResponse } from "next/server";
import { z } from "zod";

import {
  confirmProfile,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/server/identity/session";

const confirmProfileRequestSchema = z
  .object({ username: z.string() })
  .strict();

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Enter a valid X username." },
      { status: 400 },
    );
  }

  const parsedBody = confirmProfileRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Enter a valid X username." },
      { status: 400 },
    );
  }

  try {
    const identity = await confirmProfile(parsedBody.data.username);
    const response = NextResponse.json(identity.profile);

    response.cookies.set(
      SESSION_COOKIE_NAME,
      identity.rawSessionToken,
      getSessionCookieOptions(identity.expiresAt),
    );

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Enter a valid X username." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "We couldn't prepare your profile. Try again." },
      { status: 500 },
    );
  }
}
