// Target classification — fingerprints a target and matches it against the
// application-type taxonomy from Bug_Bounty_Methodology_Detailed.docx §7
// ("Testing Approach by Application Type" / §7.19 quick-reference table),
// then recommends which of the ported modules to run. This only ever
// classifies+recommends — it never runs a scan module itself.

export type AppType =
  | "static_site"
  | "wordpress_cms"
  | "spa"
  | "api_first_graphql"
  | "admin_panel"
  | "dynamic_web_app"
  | "unknown";

export interface ClassificationResult {
  type: AppType;
  label: string;
  confidence: "high" | "medium" | "low";
  signals: string[];
  docReference: string;
  recommendedModules: string[];
}

const FETCH_TIMEOUT_MS = 8000;

async function fetchSafe(url: string, init?: RequestInit): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "follow" });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function joinUrl(base: string, path: string): string {
  const u = new URL(base);
  return `${u.protocol}//${u.host}${path}`;
}

export async function classifyTarget(targetUrl: string): Promise<ClassificationResult> {
  const signals: string[] = [];
  const resp = await fetchSafe(targetUrl);
  const body = resp ? await resp.text().then((t) => t.slice(0, 200_000)).catch(() => "") : "";
  const headers = resp?.headers;

  const server = headers?.get("server") ?? "";
  const poweredBy = headers?.get("x-powered-by") ?? "";
  const setCookie = headers?.get("set-cookie") ?? "";

  // Auxiliary probes — small, curated set of paths the methodology doc calls out
  // for exactly this purpose (§7.1 static-site recon, §6.3 GraphQL, §7.4 API-first).
  const [wpLogin, graphql, swagger, openapi] = await Promise.all([
    fetchSafe(joinUrl(targetUrl, "/wp-login.php")),
    fetchSafe(joinUrl(targetUrl, "/graphql")),
    fetchSafe(joinUrl(targetUrl, "/swagger.json")),
    fetchSafe(joinUrl(targetUrl, "/openapi.json")),
  ]);

  const isWordpress =
    /wp-content|wp-includes/i.test(body) ||
    /wordpress/i.test(poweredBy) ||
    (wpLogin !== null && wpLogin.status !== 404 && wpLogin.status !== 0);
  if (isWordpress) signals.push("wp-content/wp-includes markers or reachable /wp-login.php");

  const hasGraphql = graphql !== null && graphql.status !== 404 && graphql.status !== 0;
  const hasApiSpec =
    (swagger !== null && swagger.status !== 404 && swagger.status !== 0) ||
    (openapi !== null && openapi.status !== 404 && openapi.status !== 0);
  if (hasGraphql) signals.push("/graphql endpoint reachable");
  if (hasApiSpec) signals.push("/swagger.json or /openapi.json reachable");

  const isSpa =
    /__NEXT_DATA__/.test(body) ||
    /data-reactroot|id=["']root["']/.test(body) ||
    /ng-version/.test(body) ||
    /data-v-app|__nuxt/.test(body);
  if (isSpa) signals.push("SPA framework markers (Next.js/React/Angular/Vue) in HTML");

  const looksLikeAdmin =
    /\/admin|\/login/i.test(targetUrl) || /<title>[^<]*(admin|login)[^<]*<\/title>/i.test(body);
  if (looksLikeAdmin) signals.push("URL path or page title suggests an admin/login surface");

  const hasSessionCookie = /session|token|auth/i.test(setCookie);
  if (hasSessionCookie) signals.push("Set-Cookie suggests session/auth state");

  if (server) signals.push(`Server header: ${server}`);
  if (poweredBy) signals.push(`X-Powered-By: ${poweredBy}`);

  // ── Decision order follows specificity: most identifiable signal wins ──
  if (hasGraphql || hasApiSpec) {
    return {
      type: "api_first_graphql",
      label: "API-First / GraphQL",
      confidence: "high",
      signals,
      docReference: "§7.4 API-First Applications / §6.3 GraphQL-specific testing",
      recommendedModules: [
        "tech_fingerprint", "cors_check", "idor_probe", "role_matrix_probe", "rate_limit_probe",
        "mass_assignment_probe", "jwt_audit", "ssrf_probe", "sqli_probe",
      ],
    };
  }

  if (isWordpress) {
    return {
      type: "wordpress_cms",
      label: "WordPress / CMS",
      confidence: "high",
      signals,
      docReference: "§7.1 Static Websites & CMS recon (§1.2 file/path discovery applies directly)",
      recommendedModules: [
        "tech_fingerprint", "cors_check", "subdomain_takeover_check",
        "security_headers_audit", "xss_probe", "sqli_probe",
      ],
    };
  }

  if (looksLikeAdmin) {
    return {
      type: "admin_panel",
      label: "Admin Panel",
      confidence: "medium",
      signals,
      docReference: "§7.11 Enterprise / Admin Panels — focus on vertical privilege escalation",
      recommendedModules: [
        "cors_check", "jwt_audit", "role_matrix_probe", "mass_assignment_probe",
        "rate_limit_probe", "security_headers_audit", "tech_fingerprint",
      ],
    };
  }

  if (isSpa) {
    return {
      type: "spa",
      label: "Single Page Application (SPA)",
      confidence: "high",
      signals,
      docReference: "§7.3 Single Page Applications — React / Angular / Vue",
      recommendedModules: ["tech_fingerprint", "cors_check", "jwt_audit", "xss_probe", "security_headers_audit"],
    };
  }

  if (hasSessionCookie) {
    return {
      type: "dynamic_web_app",
      label: "Dynamic Web Application",
      confidence: "medium",
      signals,
      docReference: "§7.2 Dynamic Web Applications — auth → IDOR → business logic → injection",
      recommendedModules: [
        "tech_fingerprint", "cors_check", "jwt_audit", "idor_probe", "role_matrix_probe", "sqli_probe",
        "xss_probe", "ssti_probe", "open_redirect_probe", "mass_assignment_probe",
        "path_traversal_probe", "security_headers_audit", "rate_limit_probe",
        "subdomain_takeover_check",
      ],
    };
  }

  if (!resp) {
    return {
      type: "unknown",
      label: "Unknown / Unreachable",
      confidence: "low",
      signals: ["Target did not respond within the timeout"],
      docReference: "§7.19 Quick reference — where to start by type",
      recommendedModules: ["tech_fingerprint", "subdomain_takeover_check", "security_headers_audit"],
    };
  }

  return {
    type: "static_site",
    label: "Static Website",
    confidence: "medium",
    signals,
    docReference: "§7.1 Static Websites — treat as an entry point, focus on recon + subdomain takeover",
    recommendedModules: ["tech_fingerprint", "subdomain_takeover_check", "cors_check", "security_headers_audit"],
  };
}
