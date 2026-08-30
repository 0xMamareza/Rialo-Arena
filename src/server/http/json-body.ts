import "server-only";

import type { NextRequest } from "next/server";

export const MUTATION_JSON_BODY_LIMIT_BYTES = 2_048;

export type LimitedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: "invalid" | "too-large" };

export async function readLimitedJson(
  request: NextRequest,
  limitBytes = MUTATION_JSON_BODY_LIMIT_BYTES,
): Promise<LimitedJsonResult> {
  const contentLengthHeader = request.headers.get("content-length");

  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);

    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      return { ok: false, reason: "invalid" };
    }
    if (contentLength > limitBytes) {
      return { ok: false, reason: "too-large" };
    }
  }

  if (!request.body) {
    return { ok: false, reason: "invalid" };
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let totalBytes = 0;
  let bodyText = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > limitBytes) {
        await reader.cancel();
        return { ok: false, reason: "too-large" };
      }

      bodyText += decoder.decode(value, { stream: true });
    }

    bodyText += decoder.decode();
    return { ok: true, value: JSON.parse(bodyText) as unknown };
  } catch {
    return { ok: false, reason: "invalid" };
  } finally {
    reader.releaseLock();
  }
}
