// CORS misconfiguration tester — TS port of the already-hardened Python
// version (app/modules/cors_check.py in the dropped ghostx-web project),
// itself a rewrite of the CLI toolkit's ghost_cors.sh. The original bash
// built its request via `eval curl -sI -H "Origin: $ORIGIN" ... "$TARGET"` —
// a command-injection risk once the target is web-form input. This version
// (like its Python predecessor) never touches a shell — plain fetch calls.
//
// Accepts an optional params.token: several real-world CORS misconfigs only
// show up on authenticated requests (the policy is applied by middleware
// that runs after auth, or unauthenticated requests take a different code
// path entirely e.g. a redirect to login). An anonymous-only probe misses
// those — always worth testing both with and without a token if the target
// has one.

import { JobContext, ModuleMeta, safeFetch, validateTargetUrl } from "./base";

export const meta: ModuleMeta = {
  id: "cors_check",
  name: "CORS Misconfiguration Tester",
  description: "Probes Access-Control-Allow-Origin/-Credentials against a battery of hostile Origin headers.",
  riskTier: "recon",
};

function testOrigins(domain: string): Array<[string, string]> {
  return [
    ["https://evil.com", "Evil domain"],
    [`https://${domain}.evil.com`, "Domain as subdomain of evil"],
    [`https://evil${domain}`, "Prefix attack"],
    [`https://${domain}evil.com`, "Suffix attack"],
    ["null", "Null origin"],
    [`http://${domain}`, "HTTP downgrade"],
    [`https://sub.${domain}`, "Subdomain (may be trusted)"],
    [`https://evil.com.${domain}`, "Evil dot domain"],
    [`https://${domain}%60evil.com`, "Backtick bypass"],
    ["https://evil.com%0d%0a", "CRLF in origin"],
  ];
}

export async function* run(
  targetRaw: string,
  params: Record<string, string>,
  ctx: JobContext
): AsyncGenerator<string> {
  const target = validateTargetUrl(targetRaw);
  const domain = target.split("//")[1]?.split("/")[0]?.split(":")[0] ?? target;
  const token = (params.token ?? "").trim();

  yield "=== GHOST CORS TESTER ===";
  yield `Target: ${target}`;
  yield `Domain: ${domain}`;
  yield token ? "Auth: sending Bearer token with every probe" : "Auth: none (unauthenticated probe only — pass params.token to also test authenticated endpoints)";
  yield "=========================";

  const findings: Array<Record<string, unknown>> = [];
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  for (const [origin, label] of testOrigins(domain)) {
    const resp = await safeFetch(target, ctx, { headers: { Origin: origin, ...authHeaders } });
    if (!resp) {
      yield `[ERR] ${label} -> request failed`;
      continue;
    }
    const acao = resp.headers.get("access-control-allow-origin") ?? "";
    const acac = resp.headers.get("access-control-allow-credentials") ?? "";

    if (acao && acao.toLowerCase().includes(origin.toLowerCase())) {
      if (acac.toLowerCase() === "true") {
        yield `[VULN] CRITICAL: ${label} -> Origin reflected + Credentials: true`;
        yield `  Access-Control-Allow-Origin: ${acao}`;
        yield `  Access-Control-Allow-Credentials: ${acac}`;
        findings.push({ severity: "CRITICAL", label, acao, acac, authenticated: Boolean(token) });
      } else {
        yield `[MEDIUM] ${label} -> Origin reflected, no credentials`;
        yield `  Access-Control-Allow-Origin: ${acao}`;
        findings.push({ severity: "MEDIUM", label, acao, authenticated: Boolean(token) });
      }
    } else if (acao.includes("*")) {
      if (acac.toLowerCase() === "true") {
        yield `[VULN] CRITICAL: ${label} -> Wildcard + Credentials (misconfigured — browsers should reject this combination, but it signals a broken CORS policy and some clients/proxies still honor it)`;
        findings.push({ severity: "CRITICAL", label, acao, acac, authenticated: Boolean(token) });
      } else {
        yield `[INFO] ${label} -> Wildcard ACAO (low risk without credentials)`;
      }
    }
  }

  ctx.result.findings = findings;
  yield "=========================";
  yield findings.length > 0
    ? `[VULN] ${findings.length} finding(s) — see structured results`
    : "[OK] No CORS misconfiguration found";
}
