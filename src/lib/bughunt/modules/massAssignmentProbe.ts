// Mass assignment detector — OWASP A01/A04:2021, CWE-915.
//
// Sends a normal-looking write request with extra, unexpected privilege
// fields (role, isAdmin, isPremium, plan) and checks whether the backend
// echoes them back as accepted rather than silently dropping them.
// Doc §3.2 / §5.1.

import { JobContext, ModuleMeta, safeFetch, validateTargetUrl } from "./base";

export const meta: ModuleMeta = {
  id: "mass_assignment_probe",
  name: "Mass Assignment Detector",
  description: "Sends extra privilege fields (role/isAdmin/plan) on a write request and checks whether they're accepted.",
  riskTier: "active",
};

const EXTRA_FIELDS: Record<string, unknown> = {
  role: "admin",
  isAdmin: true,
  isPremium: true,
  plan: "enterprise",
};

export async function* run(
  targetRaw: string,
  params: Record<string, string>,
  ctx: JobContext
): AsyncGenerator<string> {
  const target = validateTargetUrl(targetRaw);
  const token = (params.token ?? "").trim();
  const method = (params.method || "PATCH").toUpperCase();
  if (!token) {
    yield "[ERR] params.token (bearer token) is required";
    return;
  }

  yield "=== MASS ASSIGNMENT DETECTOR ===";
  yield `Target: ${target}`;
  yield `Method: ${method}`;
  yield "=================================";

  const findings: Array<Record<string, unknown>> = [];
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  yield "";
  yield "[*] Sending benign baseline request";
  const baselineBody = { name: "ghostx-mass-assignment-test" };
  const baselineResp = await safeFetch(target, ctx, { method, headers, body: JSON.stringify(baselineBody) });
  yield `    baseline status: ${baselineResp?.status ?? "no response"}`;

  yield "";
  yield "[*] Sending request with extra privilege fields";
  const injectedBody = { ...baselineBody, ...EXTRA_FIELDS };
  const resp = await safeFetch(target, ctx, { method, headers, body: JSON.stringify(injectedBody) });
  if (!resp) {
    yield "[ERR] Request failed";
    return;
  }
  const body = await resp.text().catch(() => "");

  if ([200, 201, 204].includes(resp.status)) {
    let echoed: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(body);
      echoed = Object.fromEntries(Object.entries(EXTRA_FIELDS).filter(([k, v]) => String(parsed[k]) === String(v)));
    } catch {
      /* not JSON, fall through */
    }
    if (Object.keys(echoed).length > 0) {
      yield `[VULN] Server accepted and echoed back privileged fields: ${JSON.stringify(echoed)}`;
      findings.push({ severity: "CRITICAL", check: "mass_assignment", status: resp.status, echoedFields: echoed });
    } else {
      yield `[MEDIUM] Request with extra fields succeeded (HTTP ${resp.status}) but response didn't confirm which fields were applied — verify manually (e.g. re-fetch the resource)`;
      findings.push({ severity: "MEDIUM", check: "mass_assignment_unconfirmed", status: resp.status });
    }
  } else {
    yield `[OK] Request with extra fields rejected (HTTP ${resp.status})`;
  }

  ctx.result.findings = findings;
  yield "";
  yield "=================================";
  yield findings.length > 0 ? `[VULN] ${findings.length} finding(s)` : "[OK] No mass assignment confirmed";
}
