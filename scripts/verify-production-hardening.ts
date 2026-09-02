import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { config } from "dotenv";
import { NextRequest } from "next/server";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

async function main() {
  const environment = await import("../src/server/config/environment");
  const headersModule = await import("../src/server/security/headers");
  const limiter = await import("../src/server/rate-limit/limiter");
  const clientIp = await import("../src/server/rate-limit/client-ip");

  const productionEnvironment = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://arena:secret@database.example/rialo_arena",
    DATABASE_CONNECTION_MODE: "direct",
    DATABASE_TLS_MODE: "verify-full",
    RATE_LIMIT_HMAC_SECRET: "r".repeat(32),
    TRUSTED_PROXY_IP_HEADER: "x-real-ip",
    NEXT_PUBLIC_SITE_URL: "https://rialoarena.xyz",
  };

  environment.validateProductionEnvironment(productionEnvironment, "24.0.0");
  for (const requiredName of [
    "DATABASE_URL",
    "DATABASE_CONNECTION_MODE",
    "DATABASE_TLS_MODE",
    "RATE_LIMIT_HMAC_SECRET",
    "TRUSTED_PROXY_IP_HEADER",
    "NEXT_PUBLIC_SITE_URL",
  ]) {
    const missing = { ...productionEnvironment, [requiredName]: undefined };
    assert.throws(() =>
      environment.validateProductionEnvironment(missing, "24.0.0"),
    );
  }
  assert.throws(() =>
    environment.validateProductionEnvironment(
      {
        ...productionEnvironment,
        TRUSTED_PROXY_IP_HEADER: "x-forwarded-for",
      },
      "24.0.0",
    ),
  );
  assert.throws(() =>
    environment.validateProductionEnvironment(productionEnvironment, "22.0.0"),
  );
  assert.equal(
    environment.getPublicSiteUrlEnvironment({
      ...productionEnvironment,
      NEXT_PUBLIC_SITE_URL: "https://rialoarena.xyz/",
    }),
    "https://rialoarena.xyz",
  );
  assert.throws(() =>
    environment.getPublicSiteUrlEnvironment({
      ...productionEnvironment,
      NEXT_PUBLIC_SITE_URL: "https://rialoarena.xyz/share",
    }),
  );
  assert.throws(() =>
    environment.getToolingDatabaseEnvironment(
      {
        ...productionEnvironment,
        DATABASE_CONNECTION_MODE: "pooled",
      },
      "24.0.0",
    ),
  );

  const spoofedIp = "203.0.113.10";
  const canonicalIp = "2001:db8::55";
  assert.equal(
    clientIp.getClientIpRateLimitKey(
      new NextRequest("http://localhost/api/leaderboard", {
        headers: { "x-forwarded-for": spoofedIp },
      }),
    ),
    clientIp.UNAVAILABLE_CLIENT_IP,
  );
  assert.equal(
    clientIp.getClientIpRateLimitKey(
      new NextRequest("http://localhost/api/leaderboard", {
        headers: {
          "x-forwarded-for": spoofedIp,
          "x-real-ip": canonicalIp,
        },
      }),
    ),
    canonicalIp,
  );

  const hmacSecret = "h".repeat(32);
  const expectedHmac = createHmac("sha256", hmacSecret)
    .update(
      `rialo-arena-rate-limit:v1:${limiter.PROFILE_CONFIRM_RATE_LIMIT.scope}:${canonicalIp}`,
    )
    .digest("hex");
  assert.equal(
    limiter.createRateLimitKeyHash(
      limiter.PROFILE_CONFIRM_RATE_LIMIT,
      canonicalIp,
      hmacSecret,
    ),
    expectedHmac,
  );
  assert.equal(expectedHmac.includes(canonicalIp), false);

  const developmentHeaders = headersModule.getSecurityHeaders(false);
  const productionHeaders = headersModule.getSecurityHeaders(true);
  const headerValue = (name: string, headers: typeof productionHeaders) =>
    headers.find((header) => header.key.toLowerCase() === name)?.value;

  assert.equal(headerValue("x-frame-options", productionHeaders), "DENY");
  assert.equal(
    headerValue("content-security-policy", productionHeaders),
    "frame-ancestors 'none'",
  );
  assert.equal(
    headerValue("x-content-type-options", productionHeaders),
    "nosniff",
  );
  assert.equal(
    headerValue("referrer-policy", productionHeaders),
    "strict-origin-when-cross-origin",
  );
  assert.ok(headerValue("permissions-policy", productionHeaders));
  assert.equal(
    headerValue("strict-transport-security", productionHeaders),
    "max-age=31536000; includeSubDomains",
  );
  assert.equal(
    headerValue("strict-transport-security", developmentHeaders),
    undefined,
  );

  const nextConfig = (await import("../next.config")).default;
  assert.equal(nextConfig.poweredByHeader, false);

  const profileRoute = await import("../src/app/api/profile/confirm/route");
  const answerRoute = await import(
    "../src/app/api/quiz/answer/[attemptId]/route"
  );
  const oversizedBody = JSON.stringify({ value: "x".repeat(3_000) });
  const oversizedHeaders = {
    "content-type": "application/json",
    origin: "http://localhost",
    "x-real-ip": canonicalIp,
  };
  const oversizedProfile = await profileRoute.POST(
    new NextRequest("http://localhost/api/profile/confirm", {
      method: "POST",
      headers: oversizedHeaders,
      body: oversizedBody,
    }),
  );
  assert.equal(oversizedProfile.status, 413);
  const oversizedAnswer = await answerRoute.POST(
    new NextRequest(
      `http://localhost/api/quiz/answer/${randomUUID()}`,
      {
        method: "POST",
        headers: oversizedHeaders,
        body: oversizedBody,
      },
    ),
    { params: Promise.resolve({ attemptId: randomUUID() }) },
  );
  assert.equal(oversizedAnswer.status, 413);

  console.log("Verified production environment fail-closed validation.");
  console.log("Verified trusted proxy extraction and spoofed-header rejection.");
  console.log("Verified secret-keyed HMAC rate-limit identifiers.");
  console.log("Verified security headers and disabled X-Powered-By.");
  console.log("Verified shared oversized JSON rejection.");
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? `Production hardening verification failed: ${error.message}`
      : "Production hardening verification failed.",
  );
  process.exitCode = 1;
});
