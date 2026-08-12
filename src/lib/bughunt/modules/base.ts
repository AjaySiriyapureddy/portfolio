// Shared helpers for scan modules.
//
// Why no shell here: these are ports of the CLI toolkit's bash modules
// (D:\Personal\Cybersecurity\automation), which were designed for a trusted
// operator typing commands themselves. Here targets come from an authenticated
// admin form instead, so every module talks HTTP/DNS directly via Node's
// global fetch and dns/promises — there is no shell in the path at all.

const TARGET_RE = /^https?:\/\/[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+(:\d{1,5})?(\/[^\s]*)?$/;

export class InvalidTargetError extends Error {}

export function validateTargetUrl(target: string): string {
  const trimmed = target.trim();
  if (!TARGET_RE.test(trimmed)) {
    throw new InvalidTargetError(`'${trimmed}' is not a valid http(s):// target URL`);
  }
  return trimmed;
}

export interface JobContext {
  result: Record<string, unknown>;
  userAgent: string;
  requestTimeoutMs: number;
}

export function makeContext(overrides?: Partial<JobContext>): JobContext {
  return {
    result: {},
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    requestTimeoutMs: 10_000,
    ...overrides,
  };
}

export async function safeFetch(
  url: string,
  ctx: JobContext,
  init?: RequestInit
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ctx.requestTimeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { "User-Agent": ctx.userAgent, ...(init?.headers ?? {}) },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type ModuleFn = (
  target: string,
  params: Record<string, string>,
  ctx: JobContext
) => AsyncGenerator<string>;

export interface ModuleMeta {
  id: string;
  name: string;
  description: string;
  riskTier: "recon" | "active";
}
