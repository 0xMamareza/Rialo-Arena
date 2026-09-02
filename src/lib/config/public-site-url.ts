const DEVELOPMENT_SITE_URL = "http://localhost:3000";

type PublicSiteUrlOptions = {
  configuredUrl: string | undefined;
  fallbackOrigin?: string;
  production: boolean;
};

export function normalizePublicSiteUrl(value: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a valid absolute URL.");
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname !== "/" && parsed.pathname !== "")
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without credentials, a path, query, or fragment.",
    );
  }

  return parsed.origin;
}

export function resolvePublicSiteUrl({
  configuredUrl,
  fallbackOrigin,
  production,
}: PublicSiteUrlOptions) {
  const configured = configuredUrl?.trim();

  if (configured) {
    return normalizePublicSiteUrl(configured);
  }

  if (production) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required in production.");
  }

  return normalizePublicSiteUrl(fallbackOrigin ?? DEVELOPMENT_SITE_URL);
}

export function getPublicSiteUrl(fallbackOrigin?: string) {
  return resolvePublicSiteUrl({
    configuredUrl: process.env.NEXT_PUBLIC_SITE_URL,
    fallbackOrigin,
    production: process.env.NODE_ENV === "production",
  });
}
