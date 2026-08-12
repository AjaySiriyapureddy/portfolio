// SQL / NoSQL injection detector — OWASP A03:2021 Injection, CWE-89.
//
// Error-signature based only: no blind/time-based exploitation, no attempt
// to actually extract data. `target` is a URL whose query string includes
// the parameter to fuzz (e.g. https://target.com/product?id=1);
// params.param names that parameter. Optional params.jsonKeys (comma-
// separated) additionally tries a NoSQL operator-injection JSON body against
// the same URL via POST (doc §6.4's `{"username":{"$ne":null}}` pattern).

import { JobContext, ModuleMeta, safeFetch, validateTargetUrl } from "./base";

export const meta: ModuleMeta = {
  id: "sqli_probe",
  name: "SQL / NoSQL Injection Detector",
  description: "Looks for raw DB error signatures after single-quote/operator injection — detection only, no exploitation.",
  riskTier: "recon",
};

const SQLI_PAYLOADS = ["'", "''", "' OR '1'='1", "' OR '1'='1'--", "\" OR \"1\"=\"1", "1' AND '1'='1"];

const DB_ERROR_RE = new RegExp(
  [
    "sql syntax", "odbc", "ORA-\\d+", "mysql_fetch", "you have an error in your sql",
    "unclosed quotation mark", "quoted string not properly terminated",
    "pg::syntaxerror", "sqlstate", "sqlite3::", "unterminated quoted string",
    "warning: mysql", "microsoft ole db provider for sql server",
    "postgresql query failed", "supplied argument is not a valid mysql",
  ].join("|"),
  "i"
);

export async function* run(
  targetRaw: string,
  params: Record<string, string>,
  ctx: JobContext
): AsyncGenerator<string> {
  const target = validateTargetUrl(targetRaw);
  const param = (params.param ?? "").trim();
  if (!param) {
    yield "[ERR] params.param (the query param to fuzz) is required";
    return;
  }

  yield "=== SQL / NoSQL INJECTION DETECTOR ===";
  yield `Target: ${target}`;
  yield `Parameter: ${param}`;
  yield "=======================================";

  const findings: Array<Record<string, unknown>> = [];
  const url = new URL(target);
  const baselineValue = url.searchParams.get(param) ?? "1";

  yield "";
  yield "[*] Baseline request";
  url.searchParams.set(param, baselineValue);
  const baseline = await safeFetch(url.toString(), ctx);
  const baselineBody = baseline ? await baseline.text().catch(() => "") : "";
  yield `    baseline length: ${baselineBody.length}, status: ${baseline?.status ?? "no response"}`;

  yield "";
  yield "[*] Testing error-based SQLi payloads";
  for (const payload of SQLI_PAYLOADS) {
    const testUrl = new URL(target);
    testUrl.searchParams.set(param, baselineValue + payload);
    const resp = await safeFetch(testUrl.toString(), ctx);
    if (!resp) {
      yield `[ERR] payload ${JSON.stringify(payload)} -> request failed`;
      continue;
    }
    const body = await resp.text().catch(() => "");
    const match = DB_ERROR_RE.exec(body);
    if (match) {
      yield `[VULN] DB error signature triggered by ${JSON.stringify(payload)}: "${match[0]}"`;
      findings.push({ severity: "CRITICAL", check: "sqli_error_based", payload, signature: match[0] });
    } else if (Math.abs(body.length - baselineBody.length) > Math.max(200, baselineBody.length * 0.5)) {
      yield `[MEDIUM] Response size shifted significantly for ${JSON.stringify(payload)} (${baselineBody.length} -> ${body.length} bytes) — worth manual review`;
      findings.push({ severity: "MEDIUM", check: "sqli_response_delta", payload, baselineBytes: baselineBody.length, bytes: body.length });
    }
  }

  const jsonKeys = (params.jsonKeys ?? "").split(",").map((k) => k.trim()).filter(Boolean);
  if (jsonKeys.length > 0) {
    yield "";
    yield `[*] Testing NoSQL operator injection on JSON body fields: ${jsonKeys.join(", ")}`;
    const wrongBody: Record<string, string> = {};
    const injectBody: Record<string, { $ne: null }> = {};
    for (const key of jsonKeys) {
      wrongBody[key] = "ghostx-wrong-value";
      injectBody[key] = { $ne: null };
    }
    const wrongResp = await safeFetch(target, ctx, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wrongBody),
    });
    const injectResp = await safeFetch(target, ctx, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(injectBody),
    });
    if (wrongResp && injectResp && wrongResp.status !== injectResp.status) {
      yield `[VULN] NoSQL operator injection changed response status: baseline ${wrongResp.status} vs injected ${injectResp.status}`;
      findings.push({ severity: "HIGH", check: "nosql_operator_injection", baselineStatus: wrongResp.status, injectedStatus: injectResp.status });
    } else {
      yield "[OK] No status difference observed from NoSQL operator injection";
    }
  }

  ctx.result.findings = findings;
  yield "";
  yield "=======================================";
  yield findings.length > 0
    ? `[VULN] ${findings.length} finding(s) — see structured results`
    : "[OK] No injection signatures found";
}
