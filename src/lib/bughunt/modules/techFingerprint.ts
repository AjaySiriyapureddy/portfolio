// Technology fingerprinting — TS port of app/modules/tech_fingerprint.py
// (dropped ghostx-web project). HTTP-only: response headers + HTML/JS
// library detection. No external binaries (no whatweb/nmap dependency).

import { JobContext, ModuleMeta, safeFetch, validateTargetUrl } from "./base";

export const meta: ModuleMeta = {
  id: "tech_fingerprint",
  name: "Technology Fingerprinting",
  description: "Identifies server/framework/CMS/JS-library versions from headers and page content.",
  riskTier: "recon",
};

const JS_LIBS: Array<[string, string]> = [
  ["jquery", "jQuery"], ["react", "React"], ["angular", "Angular"],
  ["vue", "Vue.js"], ["bootstrap", "Bootstrap"], ["lodash", "Lodash"],
  ["moment", "Moment.js"], ["axios", "Axios"], ["backbone", "Backbone"],
  ["ember", "Ember"], ["next", "Next.js"], ["nuxt", "Nuxt"],
  ["svelte", "Svelte"], ["tailwind", "Tailwind"], ["d3", "D3.js"],
];

const CMS_HINTS = ["wordpress", "drupal", "joomla", "wix", "shopify", "squarespace"];

export async function* run(
  targetRaw: string,
  _params: Record<string, string>,
  ctx: JobContext
): AsyncGenerator<string> {
  const target = validateTargetUrl(targetRaw);

  yield "=== TECHNOLOGY FINGERPRINT ===";
  yield `Target: ${target}`;
  yield "===============================";

  const techManifest: Array<Record<string, string>> = [];

  yield "";
  yield "[*] Step 1: HTTP response header analysis";
  const resp = await safeFetch(target, ctx);
  if (!resp) {
    yield "[ERR] Request failed";
    return;
  }

  for (const [header, label] of [
    ["server", "Web-Server"], ["x-powered-by", "Framework"],
    ["x-aspnet-version", "ASP.NET"], ["via", "Proxy"],
  ] as const) {
    const value = resp.headers.get(header);
    if (value) {
      yield `[+] ${label}: ${value}`;
      techManifest.push({ tech: label, version: value, source: "header" });
    }
  }

  yield "";
  yield "[*] Step 2: HTML meta + JavaScript library detection";
  const body = await resp.text().catch(() => "");

  for (const m of body.matchAll(/content="([^"]*)"/gi)) {
    const content = m[1];
    const hint = CMS_HINTS.find((h) => content.toLowerCase().includes(h));
    if (hint) {
      yield `[+] CMS: ${content}`;
      techManifest.push({ tech: "CMS", version: content, source: "meta" });
      break;
    }
  }

  for (const [pattern, name] of JS_LIBS) {
    const m = new RegExp(`${pattern}[./"-](\\d+\\.\\d+\\.\\d+)`, "i").exec(body);
    if (m) {
      yield `[+] ${name} v${m[1]}`;
      techManifest.push({ tech: name, version: m[1], source: "html" });
    }
  }

  for (const srcMatch of body.matchAll(/src="([^"]*)"/g)) {
    const src = srcMatch[1];
    const srcLower = src.toLowerCase();
    const verMatch = /\d+\.\d+\.\d+/.exec(src);
    if (!verMatch) continue;
    const version = verMatch[0];
    if (srcLower.includes("jquery") && (srcLower.includes("cdn") || srcLower.includes("code.jquery"))) {
      techManifest.push({ tech: "jQuery-CDN", version, source: "cdn" });
    } else if (srcLower.includes("bootstrap") && srcLower.includes("cdn")) {
      techManifest.push({ tech: "Bootstrap-CDN", version, source: "cdn" });
    } else if (srcLower.includes("react") && (srcLower.includes("cdn") || srcLower.includes("unpkg"))) {
      techManifest.push({ tech: "React-CDN", version, source: "cdn" });
    } else if (srcLower.includes("angular") && srcLower.includes("cdn")) {
      techManifest.push({ tech: "Angular-CDN", version, source: "cdn" });
    } else if (srcLower.includes("vue") && srcLower.includes("cdn")) {
      techManifest.push({ tech: "Vue-CDN", version, source: "cdn" });
    }
  }

  ctx.result.techManifest = techManifest;
  yield "";
  yield "===============================";
  yield `[+] ${techManifest.length} technology signal(s) detected`;
}
