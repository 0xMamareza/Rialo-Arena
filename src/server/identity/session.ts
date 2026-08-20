import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import {
  buildXAvatarUrl,
  normalizeXUsername,
} from "@/lib/identity/username";

export const SESSION_COOKIE_NAME = "rialo_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type PublicProfile = {
  username: string;
  profileImageUrl: string;
};

export type CurrentUser = {
  id: string;
  xUsername: string;
  profileImageUrl: string;
};

type ConfirmedIdentity = {
  user: CurrentUser;
  profile: PublicProfile;
  rawSessionToken: string;
  expiresAt: Date;
};

function hashSessionToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function getSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
    expires: expiresAt,
  };
}

export async function confirmProfile(usernameInput: string): Promise<ConfirmedIdentity> {
  const xUsername = normalizeXUsername(usernameInput);
  const profileImageUrl = buildXAvatarUrl(xUsername);
  const rawSessionToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawSessionToken);

  return db.transaction(async (transaction) => {
    const timeResult = await transaction.execute<{ serverNow: string }>(
      sql`SELECT clock_timestamp()::text AS "serverNow"`,
    );
    const serverNowValue = timeResult.rows[0]?.serverNow;

    if (!serverNowValue) {
      throw new Error("Database clock did not return a timestamp.");
    }

    const serverNow = new Date(serverNowValue);

    if (Number.isNaN(serverNow.getTime())) {
      throw new Error("Database clock returned an invalid timestamp.");
    }

    const expiresAt = new Date(
      serverNow.getTime() + SESSION_DURATION_SECONDS * 1000,
    );
    const [user] = await transaction
      .insert(users)
      .values({ xUsername, profileImageUrl, updatedAt: serverNow })
      .onConflictDoUpdate({
        target: users.xUsername,
        set: { profileImageUrl, updatedAt: serverNow },
      })
      .returning({
        id: users.id,
        xUsername: users.xUsername,
        profileImageUrl: users.profileImageUrl,
      });

    if (!user) {
      throw new Error("Profile could not be created.");
    }

    await transaction.insert(sessions).values({
      userId: user.id,
      tokenHash,
      expiresAt,
      createdAt: serverNow,
    });

    return {
      user,
      profile: {
        username: user.xUsername,
        profileImageUrl: user.profileImageUrl,
      },
      rawSessionToken,
      expiresAt,
    };
  });
}

export async function resolveSessionToken(
  rawSessionToken: string | null | undefined,
): Promise<CurrentUser | null> {
  if (!rawSessionToken || !SESSION_TOKEN_PATTERN.test(rawSessionToken)) {
    return null;
  }

  const tokenHash = hashSessionToken(rawSessionToken);
  const result = await db.execute<CurrentUser>(sql`
    SELECT
      users.id,
      users.x_username AS "xUsername",
      users.profile_image_url AS "profileImageUrl"
    FROM sessions
    INNER JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ${tokenHash}
      AND sessions.expires_at > clock_timestamp()
    LIMIT 1
  `);

  return result.rows[0] ?? null;
}

export async function revokeSessionToken(
  rawSessionToken: string | null | undefined,
) {
  if (!rawSessionToken || !SESSION_TOKEN_PATTERN.test(rawSessionToken)) {
    return;
  }

  await db
    .delete(sessions)
    .where(eq(sessions.tokenHash, hashSessionToken(rawSessionToken)));
}
