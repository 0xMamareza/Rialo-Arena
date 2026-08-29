import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  confirmProfile,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  updateCurrentUserProfile,
} from "@/server/identity/session";
import { getCurrentUserFromRequest } from "@/server/identity/current-user";
import { getClientIpRateLimitKey } from "@/server/rate-limit/client-ip";
import {
  consumeRateLimit,
  PROFILE_CONFIRM_RATE_LIMIT,
} from "@/server/rate-limit/limiter";

const confirmProfileRequestSchema = z
  .object({ username: z.string() })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const decision = await consumeRateLimit(
      PROFILE_CONFIRM_RATE_LIMIT,
      getClientIpRateLimitKey(request),
    );

    if (!decision.allowed) {
      return NextResponse.json(
        { error: "Too many profile requests. Try again later." },
        {
          status: 429,
          headers: {
            "Cache-Control": "private, no-store",
            "Retry-After": String(decision.retryAfterSeconds),
          },
        },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "We couldn't prepare your profile. Try again." },
      { status: 500 },
    );
  }

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
    const currentUser = await getCurrentUserFromRequest(request);

    if (currentUser) {
      const identity = await updateCurrentUserProfile(
        currentUser.id,
        parsedBody.data.username,
      );

      return NextResponse.json(identity.profile);
    }

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
