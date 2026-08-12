// Server-Side Template Injection detector — OWASP A03:2021 Injection, CWE-1336.
//
// Sends math-based probes for several template engines (Jinja2, Twig,
// Freemarker/ERB-style, plain ${}) into a parameter and checks whether the
// engine evaluated it (a rendered "49" that wasn't there in the baseline
// confirms server-side evaluation). Doc §6.5.

import { JobContext, ModuleMeta, safeFetch, validateTargetUrl } from "./base";

export const meta: ModuleMeta = {
  id: "ssti_probe",
  name: "Server-Side Template Injection Detector",
  description: "Sends per-engine math probes (e.g. {{7*7}}) and checks for evaluated output.",
  riskTier: "recon",
};

const PROBES: Array<[string, string]> = [
  ["{{7*7}}", "Jinja2/Twig"],
  ["${7*7}", "FreeMarker/generic EL"],
  ["#{7*7}", "Ruby ERB-style"],
  ["<%= 7*7 %>", "ERB"],
  ["${{7*7}}", "Handlebars-adjacent"],
];

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

  yield "=== SSTI DETECTOR ===";
  yield `Target: ${target}`;
  yield `Parameter: ${param}`;
  yield "======================";

  const findings: Array<Record<string, unknown>> = [];

  const baselineUrl = new URL(target);
  baselineUrl.searchParams.set(param, "ghostx-baseline-value");
  const baselineResp = await safeFetch(baselineUrl.toString(), ctx);
  const baselineBody = baselineResp ? await baselineResp.text().catch(() => "") : "";
  const baselineHas49 = baselineBody.includes("49");

  yield "";
  for (const [probe, engine] of PROBES) {
    const url = new URL(target);
    url.searchParams.set(param, probe);
    const resp = await safeFetch(url.toString(), ctx);
    if (!resp) {
      yield `[ERR] ${engine} probe -> request failed`;
      continue;
    }
    const body = await resp.text().catch(() => "");
    if (body.includes("49") && !baselineHas49) {
      yield `[VULN] ${engine} probe evaluated: ${probe} -> "49" appeared in response`;
      findings.push({ severity: "CRITICAL", check: "ssti", engine, probe });
    } else {
      yield `[OK] ${engine} probe not evaluated`;
    }
  }

  ctx.result.findings = findings;
  yield "";
  yield "======================";
  yield findings.length > 0 ? `[VULN] ${findings.length} finding(s)` : "[OK] No SSTI detected across tested engines";
}
