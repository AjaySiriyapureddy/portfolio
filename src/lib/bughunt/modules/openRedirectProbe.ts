// Open redirect detector — OWASP A01:2021 Broken Access Control, CWE-601.
//
// Tests common redirect/return-URL parameter names (doc §6.6) with an
// external URL, a protocol-relative URL, and a percent-encoded variant,
// then checks whether the Location header actually points off-domain.

import { JobContext, ModuleMeta, safeFetch, validateTargetUrl } from "./base";

export const meta: ModuleMeta = {
  id: "open_redirect_probe",
  name: "Open Redirect Detector",
  description: "Tests redirect/return-URL parameters for unvalidated external redirects.",
  riskTier: "recon",
};

const COMMON_PARAMS = ["redirect", "return_to", "returnTo", "next", "url", "continue", "redirect_uri", "dest"];
const EVIL_HOST = "evil-ghostx-test.example";

function payloadsFor(): Array<[string, string]> {
  return [
    [`https://${EVIL_HOST}/`, "full external URL"],
    [`//${EVIL_HOST}/`, "protocol-relative URL"],
    [`%2F%2F${EVIL_HOST}/`, "percent-encoded protocol-relative"],
  ];
}

export async function* run(
  targetRaw: string,
  params: Record<string, string>,
  ctx: JobContext
): AsyncGenerator<string> {
  const target = validateTargetUrl(targetRaw);
  const paramList = params.param ? [params.param.trim()] : COMMON_PARAMS;

  yield "=== OPEN REDIRECT DETECTOR ===";
  yield `Target: ${target}`;
  yield `Parameters tested: ${paramList.join(", ")}`;
  yield "===============================";

  const findings: Array<Record<string, unknown>> = [];

  yield "";
  for (const param of paramList) {
    for (const [payload, label] of payloadsFor()) {
      const url = new URL(target);
      url.searchParams.set(param, payload);
      const resp = await safeFetch(url.toString(), ctx, { redirect: "manual" });
      if (!resp) continue;
      const location = resp.headers.get("location") ?? "";
      if (location && location.toLowerCase().includes(EVIL_HOST)) {
        yield `[VULN] ${param}=${label} -> Location: ${location}`;
        findings.push({ severity: "MEDIUM", check: "open_redirect", param, label, location });
      }
    }
  }

  ctx.result.findings = findings;
  yield "";
  yield "===============================";
  yield findings.length > 0
    ? `[VULN] ${findings.length} open redirect finding(s)`
    : "[OK] No open redirects confirmed on tested parameters";
}
