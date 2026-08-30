import { z } from "zod";

const X_USERNAME_PATTERN = /^[a-z0-9_]+$/;

export const RIALO_AVATAR_FALLBACK_PATH =
  "/brand/rialo/rialo-symbol-off-white.svg";

export const xUsernameSchema = z
  .string()
  .transform((value) => {
    const trimmed = value.trim();
    const withoutLeadingAt = trimmed.startsWith("@")
      ? trimmed.slice(1)
      : trimmed;

    return withoutLeadingAt.toLowerCase();
  })
  .pipe(
    z
      .string()
      .min(1, "Enter an X username.")
      .max(15, "X usernames can contain at most 15 characters.")
      .regex(
        X_USERNAME_PATTERN,
        "Use only letters, numbers, and underscores.",
      ),
  );

export function normalizeXUsername(value: string) {
  return xUsernameSchema.parse(value);
}

export function buildXAvatarUrl(value: string) {
  const username = normalizeXUsername(value);
  return `https://unavatar.io/x/${encodeURIComponent(username)}?fallback=false`;
}
