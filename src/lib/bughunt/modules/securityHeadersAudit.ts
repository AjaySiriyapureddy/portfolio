// Security headers & cookie-flag audit — OWASP A05:2021 Security
// Misconfiguration, CWE-693. Purely passive: one GET request, no fuzzing.
// Doc §2.2 (cookie flags) and §6.8 (security headers).

import { JobContext, ModuleMeta, safeFetch, validateTargetUrl } from "./base";

export const meta: ModuleMeta = {
  id: "security_headers_audit",
  name: "Security Headers & Cookie Audit",
  description: "Passive check for missing CSP/HSTS/X-Frame-Options/etc. and weak cookie flags.",
  riskTier: "recon",
};

const EXPECTED_HEADERS = [
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "strict-transport-security",
  "referrer-policy",
  "permissions-policy",
];

export async function* run(
  targetRaw: string,
  _params: Record<string, string>,
  ctx: JobContext
): AsyncGenerator<string> {
  const target = validateTargetUrl(targetRaw);

  yield "=== SECURITY HEADERS & COOKIE AUDIT ===";
  yield `Target: ${target}`;
  yield "========================================";

  const resp = await safeFetch(target, ctx);
  if (!resp) {
    yield "[ERR] Request failed";
    return;
  }

  const findings: Array<Record<string, unknown>> = [];

  yield "";
  yield "[*] Checking response headers";
  for (const header of EXPECTED_HEADERS) {
    const value = resp.headers.get(header);
    if (value) {
      yield `[OK] ${header}: ${value}`;
    } else {
      yield `[MEDIUM] Missing header: ${header}`;
      findings.push({ severity: "MEDIUM", check: "missing_header", header });
    }
  }

  const setCookie = resp.headers.get("set-cookie");
  if (setCookie) {
    yield "";
    yield "[*] Checking cookie flags";
    const cookies = setCookie.split(/,(?=[^;]+=[^;]+)/);
    for (const cookie of cookies) {
      const name = cookie.split("=")[0].trim();
      const lower = cookie.toLowerCase();
      const missing: string[] = [];
      if (!lower.includes("httponly")) missing.push("HttpOnly");
      if (!lower.includes("secure")) missing.push("Secure");
      if (!lower.includes("samesite")) missing.push("SameSite");
      if (missing.length > 0) {
        yield `[MEDIUM] Cookie '${name}' missing: ${missing.join(", ")}`;
        findings.push({ severity: "MEDIUM", check: "weak_cookie_flags", cookie: name, missing });
      } else {
        yield `[OK] Cookie '${name}' has HttpOnly/Secure/SameSite`;
      }
    }
  }

  ctx.result.findings = findings;
  yield "";
  yield "========================================";
  yield findings.length > 0
    ? `[MEDIUM] ${findings.length} misconfiguration(s) found`
    : "[OK] All checked headers/cookie flags present";
}
