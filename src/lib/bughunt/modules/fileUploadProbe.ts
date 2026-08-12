// File upload validation tester — OWASP A04/A08:2021, CWE-434. Doc §5.3.
//
// The most invasive module in the set: it actually uploads harmless test
// files to the target. Every file's content is inert (a plain comment
// marker, no script/executable content whatsoever) and clearly labeled
// "ghostx-upload-test" so the target owner can identify and remove it —
// but a successful upload is still a real artifact left on someone else's
// system, unlike every other module here. Only run this against targets
// you're prepared to manually clean up after.

import { JobContext, ModuleMeta, safeFetch, validateTargetUrl } from "./base";

export const meta: ModuleMeta = {
  id: "file_upload_probe",
  name: "File Upload Validation Tester",
  description: "Uploads harmless marker files (.svg/.html/double-extension) to test type/content-type filtering. Leaves real files on the target — needs manual cleanup.",
  riskTier: "active",
};

const MARKER = "ghostx-upload-test";

function testFiles(): Array<{ filename: string; content: string; contentType: string; note: string }> {
  return [
    {
      filename: "ghostx-test.svg",
      content: `<svg xmlns="http://www.w3.org/2000/svg"><!-- ${MARKER} --></svg>`,
      contentType: "image/svg+xml",
      note: "SVG can carry script content in some renderers",
    },
    {
      filename: "ghostx-test.html",
      content: `<!-- ${MARKER} --><p>ghostx upload test, harmless marker only</p>`,
      contentType: "text/html",
      note: "raw HTML upload, stored XSS delivery vector if served inline",
    },
    {
      filename: "ghostx-test.php.jpg",
      content: `${MARKER} — plain text only, not executable PHP`,
      contentType: "image/jpeg",
      note: "double-extension trick, Content-Type mismatched from extension",
    },
  ];
}

export async function* run(
  targetRaw: string,
  params: Record<string, string>,
  ctx: JobContext
): AsyncGenerator<string> {
  const target = validateTargetUrl(targetRaw);
  const fieldName = (params.fieldName ?? "").trim();
  const token = (params.token ?? "").trim();
  if (!fieldName) {
    yield "[ERR] params.fieldName (the multipart form field the endpoint expects) is required";
    return;
  }

  yield "=== FILE UPLOAD VALIDATION TESTER ===";
  yield `Target: ${target}`;
  yield `Field: ${fieldName}`;
  yield "⚠ This uploads real files — clean up manually afterward";
  yield "=======================================";

  const findings: Array<Record<string, unknown>> = [];
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  for (const file of testFiles()) {
    yield "";
    yield `[*] Uploading ${file.filename} (${file.note})`;
    const form = new FormData();
    form.append(fieldName, new Blob([file.content], { type: file.contentType }), file.filename);

    const resp = await safeFetch(target, ctx, { method: "POST", headers, body: form });
    if (!resp) {
      yield "[ERR] Upload request failed";
      continue;
    }
    const body = await resp.text().catch(() => "");
    yield `    status: ${resp.status}`;

    if (![200, 201, 202].includes(resp.status)) {
      yield "[OK] Upload rejected";
      continue;
    }

    // Only trust a URL that actually references our marker filename — a bare
    // "first URL in the body" match is too easy to false-positive on (an
    // echoed XML namespace, a canonical link, an unrelated API field, etc).
    const markerFilename = file.filename.replace(".", "\\.");
    const urlMatch = new RegExp(`https?:\\/\\/[^\\s"'<>]*${markerFilename}[^\\s"'<>]*`).exec(body);
    if (!urlMatch) {
      yield `[MEDIUM] Upload accepted (HTTP ${resp.status}) but no URL referencing ${file.filename} was found in the response — verify manually`;
      findings.push({ severity: "MEDIUM", check: "upload_accepted_unconfirmed", filename: file.filename, status: resp.status });
      continue;
    }

    const fileUrl = urlMatch[0];
    yield `    returned URL: ${fileUrl}`;
    const fetchResp = await safeFetch(fileUrl, ctx);
    if (fetchResp && fetchResp.status === 200) {
      const servedType = fetchResp.headers.get("content-type") ?? "unknown";
      yield `[VULN] Uploaded file is live at ${fileUrl} (served as ${servedType}) — remember to delete it from the target`;
      findings.push({
        severity: "HIGH",
        check: "unrestricted_upload",
        filename: file.filename,
        url: fileUrl,
        servedContentType: servedType,
      });
    }
  }

  ctx.result.findings = findings;
  yield "";
  yield "=======================================";
  yield findings.length > 0
    ? `[VULN] ${findings.length} finding(s) — remember to manually delete any uploaded test files from the target`
    : "[OK] No unrestricted uploads confirmed";
}
