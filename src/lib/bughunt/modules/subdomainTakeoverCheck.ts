// Subdomain takeover scanner — TS port of app/modules/subdomain_takeover_check.py
// (dropped ghostx-web project). `target` is a single subdomain. CNAME lookups
// use Node's dns/promises instead of shelling out to `dig`.

import { promises as dns } from "dns";
import { JobContext, ModuleMeta, safeFetch } from "./base";

export const meta: ModuleMeta = {
  id: "subdomain_takeover_check",
  name: "Subdomain Takeover Scanner",
  description: "Checks a subdomain's CNAME for dangling third-party services and known takeover fingerprints.",
  riskTier: "recon",
};

const TAKEOVER_SIGS: Record<string, string> = {
  "s3.amazonaws.com": "NoSuchBucket|The specified bucket does not exist",
  "herokuapp.com": "no-such-app|there is no app configured",
  "github.io": "There isn't a GitHub Pages site here",
  "shopify.com": "Sorry, this shop is currently unavailable",
  "tumblr.com": "Whatever you were looking for doesn't currently exist",
  "wordpress.com": "Do you want to register",
  "ghost.io": "The thing you were looking for is no longer here",
  "surge.sh": "project not found",
  "bitbucket.io": "Repository not found",
  "pantheon.io": "The gods are wise",
  "readme.io": "Project doesnt exist",
  "zendesk.com": "Help Center Closed",
  "teamwork.com": "Oops - We didn't find your site",
  "helpjuice.com": "We could not find what you're looking for",
  "helpscout.net": "No settings were found",
  "cargo.site": "If you're moving your domain away",
  "statuspage.io": "You are being redirected|Status page",
  "intercom.help": "This page is reserved for",
  "webflow.io": "The page you are looking for doesn't exist",
  "netlify.app": "Not Found - Request ID",
  "fly.dev": "404 Not Found",
  "azurewebsites.net": "404 Web Site not found",
  "cloudfront.net": "Bad Request|ERROR: The request could not be satisfied",
  "elasticbeanstalk.com": "404 Not Found",
  "unbounce.com": "The requested URL was not found",
  "launchrock.com": "It looks like you may have taken a wrong turn",
  "pingdom.com": "This public report page has not been activated",
  "tictail.com": "to target URL|Starting your own",
  "campaignmonitor.com": "Trying to access your account",
  "cargocollective.com": "404 Not Found",
  "feedpress.me": "The feed has not been found",
  "freshdesk.com": "There is no helpdesk here",
  "strikingly.com": "But if you are looking for your own",
  "uptimerobot.com": "page not found",
  "tilda.cc": "Please renew your subscription",
  "wix.com": "Error ConnectYourDomain",
  "squarespace.com": "No Such Account",
};

export async function* run(
  targetRaw: string,
  _params: Record<string, string>,
  ctx: JobContext
): AsyncGenerator<string> {
  const sub = targetRaw.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

  yield "=== GHOST SUBDOMAIN TAKEOVER SCANNER ===";
  yield `Target: ${sub}`;
  yield "==========================================";

  const findings: Array<Record<string, unknown>> = [];

  let cname: string | null = null;
  try {
    const records = await dns.resolveCname(sub);
    cname = records[0]?.replace(/\.$/, "") ?? null;
  } catch {
    cname = null;
  }

  if (!cname) {
    yield "";
    yield "[*] No CNAME record found - nothing to check";
    ctx.result.findings = findings;
    return;
  }

  yield "";
  yield `[*] CNAME: ${cname}`;

  const matchedPattern = Object.keys(TAKEOVER_SIGS).find((p) => cname!.toLowerCase().includes(p));
  if (matchedPattern) {
    const signature = TAKEOVER_SIGS[matchedPattern];
    const resp = await safeFetch(`http://${sub}`, ctx);
    const body = resp ? await resp.text().catch(() => "") : "";
    const status = resp?.status ?? null;

    const sigPatterns = signature.split("|");
    if (sigPatterns.some((s) => body.toLowerCase().includes(s.toLowerCase()))) {
      yield `[VULN] ${sub} -> CNAME: ${cname} -> TAKEOVER POSSIBLE (HTTP ${status})`;
      yield `  Matched signature: ${signature}`;
      findings.push({ severity: "CRITICAL", type: "takeover_confirmed", subdomain: sub, cname, httpStatus: status });
    } else if (status === null || status === 404) {
      yield `[POSSIBLE] ${sub} -> ${cname} (HTTP ${status}, needs manual check)`;
      findings.push({ severity: "MEDIUM", type: "takeover_possible", subdomain: sub, cname, httpStatus: status });
    }
  }

  try {
    await dns.resolve4(cname);
  } catch (exc: unknown) {
    const code = (exc as NodeJS.ErrnoException)?.code;
    if (code === "ENOTFOUND" || code === "ENODATA") {
      yield `[DANGLING] ${sub} -> CNAME ${cname} resolves to NXDOMAIN`;
      findings.push({ severity: "HIGH", type: "dangling_cname", subdomain: sub, cname });
    }
  }

  ctx.result.findings = findings;
  yield "";
  yield "==========================================";
  yield findings.length > 0 ? `[VULN] ${findings.length} finding(s) captured` : "[OK] No takeover candidates found";
}
