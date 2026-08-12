// Path traversal detector — OWASP A01:2021 Broken Access Control, CWE-22.
//
// Tests a file/path-shaped parameter with directory-traversal payloads
// (Unix and Windows variants, raw and encoded) and checks the response for
// signatures of a successfully read system file.

import { JobContext, ModuleMeta, safeFetch, validateTargetUrl } from "./base";

export const meta: ModuleMeta = {
  id: "path_traversal_probe",
  name: "Path Traversal Detector",
  description: "Tests a file/path parameter with directory-traversal payloads and checks for system-file signatures.",
  riskTier: "recon",
};

const PAYLOADS = [
  "../../../../../../etc/passwd",
  "..%2f..%2f..%2f..%2f..%2fetc%2fpasswd",
  "....//....//....//....//etc/passwd",
  "/etc/passwd",
  "..\\..\\..\\..\\..\\windows\\win.ini",
  "..%5c..%5c..%5c..%5cwindows%5cwin.ini",
];

const SIGNATURES: Array<[RegExp, string]> = [
  [/root:.*:0:0:/, "Linux /etc/passwd"],
  [/\[extensions\]|\[fonts\]/i, "Windows win.ini"],
];

export async function* run(
  targetRaw: string,
  params: Record<string, string>,
  ctx: JobContext
): AsyncGenerator<string> {
  const target = validateTargetUrl(targetRaw);
  const param = (params.param ?? "").trim();
  if (!param) {
    yield "[ERR] params.param (the file/path query param to fuzz) is required";
    return;
  }

  yield "=== PATH TRAVERSAL DETECTOR ===";
  yield `Target: ${target}`;
  yield `Parameter: ${param}`;
  yield "================================";

  const findings: Array<Record<string, unknown>> = [];

  yield "";
  for (const payload of PAYLOADS) {
    const url = new URL(target);
    url.searchParams.set(param, payload);
    const resp = await safeFetch(url.toString(), ctx);
    if (!resp) {
      yield `[ERR] ${JSON.stringify(payload)} -> request failed`;
      continue;
    }
    const body = await resp.text().catch(() => "");
    const matched = SIGNATURES.find(([re]) => re.test(body));
    if (matched) {
      yield `[VULN] ${JSON.stringify(payload)} -> ${matched[1]} signature found in response`;
      findings.push({ severity: "CRITICAL", check: "path_traversal", payload, signature: matched[1], evidence: body.slice(0, 300) });
    }
  }

  ctx.result.findings = findings;
  yield "";
  yield "================================";
  yield findings.length > 0 ? `[VULN] ${findings.length} finding(s)` : "[OK] No path traversal confirmed";
}
