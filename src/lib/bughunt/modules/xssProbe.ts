// Reflected XSS detector — OWASP A03:2021 Injection, CWE-79.
//
// Sends a unique, nonce-tagged HTML-breaking canary into a query parameter
// and checks whether it comes back unescaped in the response. Detection
// only — the payload never executes anything, it just proves the
// injection point exists and isn't being encoded.

import { JobContext, ModuleMeta, safeFetch, validateTargetUrl } from "./base";

export const meta: ModuleMeta = {
  id: "xss_probe",
  name: "Reflected XSS Detector",
  description: "Injects a unique canary into a parameter and checks whether it reflects back unescaped.",
  riskTier: "recon",
};

function randomNonce(): string {
  return Math.random().toString(36).slice(2, 10);
}

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

  yield "=== REFLECTED XSS DETECTOR ===";
  yield `Target: ${target}`;
  yield `Parameter: ${param}`;
  yield "===============================";

  const findings: Array<Record<string, unknown>> = [];
  const nonce = randomNonce();
  const canary = `ghostx${nonce}<svg/onload=x>`;

  const url = new URL(target);
  url.searchParams.set(param, canary);

  yield "";
  yield "[*] Sending canary payload";
  const resp = await safeFetch(url.toString(), ctx);
  if (!resp) {
    yield "[ERR] Request failed";
    return;
  }
  const body = await resp.text().catch(() => "");

  const rawMarker = `ghostx${nonce}<svg/onload=x>`;
  const encodedMarker = `ghostx${nonce}&lt;svg/onload=x&gt;`;

  if (body.includes(rawMarker)) {
    yield `[VULN] Canary reflected UNESCAPED — reflected XSS confirmed (nonce ${nonce})`;
    findings.push({ severity: "HIGH", check: "reflected_xss", nonce, evidence: "raw tag reflected unescaped" });
  } else if (body.includes(encodedMarker) || body.includes(`ghostx${nonce}`)) {
    yield `[OK] Canary reflected but HTML-encoded (nonce ${nonce}) — looks properly escaped`;
  } else {
    yield `[OK] Canary not reflected in response (nonce ${nonce})`;
  }

  ctx.result.findings = findings;
  yield "";
  yield "===============================";
  yield findings.length > 0 ? `[VULN] ${findings.length} finding(s)` : "[OK] No reflected XSS detected";
}
