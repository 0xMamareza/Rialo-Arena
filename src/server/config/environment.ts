const SUPPORTED_NODE_MAJOR = 24;
const DEVELOPMENT_RATE_LIMIT_SECRET =
  "rialo-arena-development-only-rate-limit-hmac-key";
const TRUSTED_PROXY_IP_HEADER = "x-real-ip";

type EnvironmentSource = Record<string, string | undefined>;

export type DatabaseEnvironment = {
  connectionMode: "direct" | "pooled";
  databaseUrl: string;
  directDatabaseUrl: string | null;
  tlsMode: "disable" | "verify-full";
};

function isProduction(source: EnvironmentSource) {
  return source.NODE_ENV === "production";
}

function readDatabaseUrl(
  source: EnvironmentSource,
  name: "DATABASE_URL" | "DATABASE_DIRECT_URL",
  required: boolean,
) {
  const value = source[name]?.trim();

  if (!value) {
    if (required) {
      throw new Error(`${name} is required.`);
    }

    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL URL.`);
  }

  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !parsed.hostname ||
    parsed.pathname === "/"
  ) {
    throw new Error(`${name} must identify a PostgreSQL host and database.`);
  }

  return value;
}

export function validateNodeRuntime(version = process.versions.node) {
  const major = Number.parseInt(version.split(".", 1)[0] ?? "", 10);

  if (major !== SUPPORTED_NODE_MAJOR) {
    throw new Error(
      `Rialo Arena requires Node ${SUPPORTED_NODE_MAJOR}.x; received ${version}.`,
    );
  }
}

export function getDatabaseEnvironment(
  source: EnvironmentSource = process.env,
  nodeVersion = process.versions.node,
): DatabaseEnvironment {
  validateNodeRuntime(nodeVersion);

  const production = isProduction(source);
  const connectionMode = source.DATABASE_CONNECTION_MODE?.trim() ||
    (production ? "" : "direct");
  const tlsMode = source.DATABASE_TLS_MODE?.trim() ||
    (production ? "" : "disable");

  if (connectionMode !== "direct" && connectionMode !== "pooled") {
    throw new Error(
      "DATABASE_CONNECTION_MODE must be explicitly set to direct or pooled.",
    );
  }
  if (tlsMode !== "disable" && tlsMode !== "verify-full") {
    throw new Error(
      "DATABASE_TLS_MODE must be explicitly set to disable or verify-full.",
    );
  }

  return {
    connectionMode,
    databaseUrl: readDatabaseUrl(source, "DATABASE_URL", true)!,
    directDatabaseUrl: readDatabaseUrl(
      source,
      "DATABASE_DIRECT_URL",
      false,
    ),
    tlsMode,
  };
}

export function getToolingDatabaseEnvironment(
  source: EnvironmentSource = process.env,
  nodeVersion = process.versions.node,
) {
  const database = getDatabaseEnvironment(source, nodeVersion);

  if (database.connectionMode === "pooled" && !database.directDatabaseUrl) {
    throw new Error(
      "DATABASE_DIRECT_URL is required for migrations and seed tooling when DATABASE_CONNECTION_MODE=pooled.",
    );
  }

  return {
    ...database,
    toolingDatabaseUrl: database.directDatabaseUrl ?? database.databaseUrl,
  };
}

export function getRateLimitHmacSecret(
  source: EnvironmentSource = process.env,
) {
  const value = source.RATE_LIMIT_HMAC_SECRET?.trim();

  if (!value) {
    if (!isProduction(source)) {
      return DEVELOPMENT_RATE_LIMIT_SECRET;
    }

    throw new Error("RATE_LIMIT_HMAC_SECRET is required in production.");
  }

  if (Buffer.byteLength(value, "utf8") < 32) {
    throw new Error("RATE_LIMIT_HMAC_SECRET must contain at least 32 bytes.");
  }
  if (isProduction(source) && value.toLowerCase().includes("replace-with")) {
    throw new Error("RATE_LIMIT_HMAC_SECRET must not use the placeholder value.");
  }

  return value;
}

export function getTrustedProxyIpHeader(
  source: EnvironmentSource = process.env,
) {
  const configured = source.TRUSTED_PROXY_IP_HEADER?.trim().toLowerCase();

  if (!configured) {
    if (isProduction(source)) {
      throw new Error("TRUSTED_PROXY_IP_HEADER is required in production.");
    }

    return TRUSTED_PROXY_IP_HEADER;
  }

  if (configured !== TRUSTED_PROXY_IP_HEADER) {
    throw new Error("TRUSTED_PROXY_IP_HEADER must be x-real-ip.");
  }

  return configured;
}

export function validateProductionEnvironment(
  source: EnvironmentSource = process.env,
  nodeVersion = process.versions.node,
) {
  if (!isProduction(source)) {
    validateNodeRuntime(nodeVersion);
    return;
  }

  getDatabaseEnvironment(source, nodeVersion);
  getRateLimitHmacSecret(source);
  getTrustedProxyIpHeader(source);
}
