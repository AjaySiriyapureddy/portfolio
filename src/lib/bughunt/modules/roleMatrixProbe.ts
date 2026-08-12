// Cross-role access control matrix — OWASP A01:2021 Broken Access Control,
// CWE-284/CWE-639. Automated equivalent of Burp's Autorize extension
// (doc §3.3): hits the same resource with multiple named role tokens and
// flags where a role that shouldn't have access gets the same successful
// response as the expected owner.
//
// `target` is the resource URL. params.tokens is a JSON object mapping role
// name -> bearer token, e.g. {"citizen":"...","department":"...","admin":"..."}.
// Key order matters: the FIRST entry is treated as the expected-owner /
// baseline role; every other role is tested against that baseline.
// params.methods (optional, default "GET") is a comma-separated list of HTTP
// methods to test — include write verbs (POST/PUT/PATCH/DELETE) deliberately
// and only when you're prepared for a real state change if access control
// really is broken.

import { JobContext, ModuleMeta, safeFetch, validateTargetUrl } from "./base";

export const meta: ModuleMeta = {
  id: "role_matrix_probe",
  name: "Cross-Role Access Control Matrix",
  description: "Tests the same resource with multiple role tokens and flags where a lower-privilege role matches the owner's access.",
  riskTier: "active",
};

function successClass(status: number): "2xx" | "other" {
  return status >= 200 && status < 300 ? "2xx" : "other";
}

export async function* run(
  targetRaw: string,
  params: Record<string, string>,
  ctx: JobContext
): AsyncGenerator<string> {
  const target = validateTargetUrl(targetRaw);
  const methods = (params.methods || "GET")
    .split(",")
    .map((m) => m.trim().toUpperCase())
    .filter(Boolean);

  let tokens: Record<string, string>;
  try {
    tokens = JSON.parse(params.tokens || "{}");
  } catch {
    yield '[ERR] params.tokens must be valid JSON, e.g. {"citizen":"<token>","admin":"<token>"}';
    return;
  }
  const roles = Object.entries(tokens);
  if (roles.length < 2) {
    yield "[ERR] params.tokens needs at least 2 roles — the first is the baseline/expected owner, the rest are tested against it";
    return;
  }

  const [baselineRole] = roles[0];
  yield "=== CROSS-ROLE ACCESS CONTROL MATRIX ===";
  yield `Target: ${target}`;
  yield `Roles: ${roles.map(([r]) => r).join(", ")} (baseline: ${baselineRole})`;
  yield `Methods: ${methods.join(", ")}`;
  yield "==========================================";

  const findings: Array<Record<string, unknown>> = [];

  for (const method of methods) {
    yield "";
    yield `[*] Method: ${method}`;
    const results: Array<{ role: string; status: number | null; bytes: number }> = [];

    for (const [role, token] of roles) {
      const resp = await safeFetch(target, ctx, { method, headers: { Authorization: `Bearer ${token}` } });
      const body = resp ? await resp.text().catch(() => "") : "";
      results.push({ role, status: resp?.status ?? null, bytes: body.length });
      yield `    ${role.padEnd(15)} -> HTTP ${resp?.status ?? "no response"} (${body.length} bytes)`;
    }

    const baseline = results[0];
    if (baseline.status !== null && successClass(baseline.status) === "2xx") {
      for (const r of results.slice(1)) {
        if (r.status !== null && successClass(r.status) === "2xx") {
          const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
          const severity = isWrite ? "CRITICAL" : "HIGH";
          yield `[VULN] ${severity}: role '${r.role}' got the same success response as baseline '${baseline.role}' via ${method}`;
          findings.push({
            severity,
            check: "cross_role_access",
            method,
            baselineRole: baseline.role,
            testedRole: r.role,
            baselineStatus: baseline.status,
            testedStatus: r.status,
          });
        }
      }
    } else {
      yield `    (baseline '${baseline.role}' didn't succeed — HTTP ${baseline.status ?? "no response"} — skipping comparison for ${method})`;
    }
  }

  ctx.result.findings = findings;
  yield "";
  yield "==========================================";
  yield findings.length > 0
    ? `[VULN] ${findings.length} cross-role access finding(s)`
    : "[OK] No cross-role access control issues confirmed";
}
