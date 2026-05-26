# VAPT Security Review Report
**Portfolio Application — Ajaya Siriyapureddy**
**Assessment Date:** 2026-05-26
**Methodology:** OWASP Top 10 (2021), SANS Top 25 CWE, DPDPA Compliance

---

## Executive Summary

**Overall Risk Rating: MEDIUM**

The application demonstrates strong security fundamentals — bcrypt(12) password hashing, JWT with pinned HS256 algorithm, comprehensive input sanitization, injection detection, path traversal prevention, and security headers. However, several vulnerabilities remain that a skilled pentester in competition could exploit.

**Critical: 1** | **High: 2** | **Medium: 4** | **Low: 3** | **Info: 3**

---

## Findings

### [CRITICAL] Rate Limit Bypass via X-Forwarded-For Spoofing

- **CWE:** CWE-348 (Use of Less Trusted Source)
- **OWASP:** A04 Insecure Design
- **File:** `src/lib/security.ts:38-46`
- **Description:** `getClientIp()` trusts the `X-Forwarded-For` header without verification. An attacker can spoof different IPs on every request to completely bypass ALL rate limiting — general API limits, contact form cooldowns, brute force protection, and forgot-password rate limits.
- **Impact:** Unlimited login attempts (brute force), unlimited contact form spam, DoS via resource exhaustion.
- **Proof of Concept:**
```bash
# Bypass brute force lockout — try unlimited passwords
for i in $(seq 1 1000); do
  curl -s -X POST http://target/api/auth/login \
    -H "Content-Type: application/json" \
    -H "X-Forwarded-For: 10.0.0.$((i % 255))" \
    -d '{"email":"admin@example.com","password":"attempt'$i'"}'
done
```
- **Remediation:** Only trust X-Forwarded-For behind a known reverse proxy. In development/direct access, use socket IP. Add `TRUSTED_PROXY` env var.

### [HIGH] Missing Content-Security-Policy (CSP) Header

- **CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers)
- **OWASP:** A05 Security Misconfiguration
- **File:** `src/middleware.ts` and `next.config.ts`
- **Description:** No CSP header is set. If any XSS vector is discovered (even through a future code change), there is no defense-in-depth to prevent script execution.
- **Impact:** If stored XSS is found, attacker scripts run with full page access — can steal JWT tokens from sessionStorage, exfiltrate admin data.
- **Remediation:** Add strict CSP header in middleware.

### [HIGH] Prototype Pollution in Database Update Operations

- **CWE:** CWE-1321 (Improperly Controlled Modification of Object Prototype Attributes)
- **OWASP:** A08 Software and Data Integrity Failures
- **Files:** `src/lib/db.ts:113-119` (projects.update), and all other `.update()` methods
- **Description:** Update operations use spread: `{ ...existing, ...userInput }`. If an attacker sends `{"__proto__": {"isAdmin": true}}` or `{"constructor": {"prototype": {"isAdmin": true}}}`, it could pollute Object.prototype.
- **Impact:** Potential auth bypass in future code, unexpected behavior.
- **Proof of Concept:**
```bash
curl -X PUT http://target/api/projects \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id":"1","__proto__":{"isAdmin":true},"constructor":{"prototype":{"pwned":true}}}'
```
- **Remediation:** Strip dangerous keys (`__proto__`, `constructor`, `prototype`) from all user input before spread.

### [MEDIUM] Privacy Endpoint Allows Unauthenticated Data Deletion

- **CWE:** CWE-862 (Missing Authorization)
- **OWASP:** A01 Broken Access Control
- **File:** `src/app/api/privacy/route.ts`
- **Description:** POST `/api/privacy` deletes all messages from a given email without any authentication. While designed for DPDPA compliance, an attacker can enumerate emails and delete others' messages.
- **Impact:** Data loss — attacker can delete contact form submissions from legitimate senders.
- **Proof of Concept:**
```bash
curl -X POST http://target/api/privacy \
  -H "Content-Type: application/json" \
  -d '{"email":"victim@example.com"}'
```
- **Remediation:** Add email verification (send confirmation link) or CAPTCHA before deletion. At minimum, require the exact email match and add stricter rate limiting.

### [MEDIUM] No Request Body Size Limit

- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **OWASP:** A04 Insecure Design
- **Files:** All API route handlers
- **Description:** No explicit body size validation. An attacker can send multi-megabyte JSON payloads to exhaust server memory.
- **Impact:** Denial of service via memory exhaustion.
- **Proof of Concept:**
```bash
python3 -c "print('{\"name\":\"' + 'A'*50000000 + '\"}')" | \
  curl -X POST http://target/api/contact \
    -H "Content-Type: application/json" -d @-
```
- **Remediation:** Add Content-Length check early in request processing (reject >1MB).

### [MEDIUM] Admin Content Fields Lack Length Validation

- **CWE:** CWE-20 (Improper Input Validation)
- **OWASP:** A03 Injection
- **Files:** `src/app/api/projects/route.ts`, `skills/route.ts`, `ctf/route.ts`, `blog/route.ts`
- **Description:** Admin-created content (projects, skills, CTF, blog) only sanitizes HTML but doesn't enforce max length. A compromised admin session could store extremely large values.
- **Impact:** Storage exhaustion, rendering performance degradation.
- **Remediation:** Add max length checks (e.g., title: 200, description: 5000).

### [MEDIUM] TOCTOU Race Condition in File Database

- **CWE:** CWE-367 (Time-of-check Time-of-use)
- **OWASP:** A04 Insecure Design
- **File:** `src/lib/db.ts`
- **Description:** Read-modify-write operations (getAll → modify → writeJson) are not atomic. Concurrent requests could cause data loss.
- **Impact:** Under concurrent load, writes can overwrite each other (lost updates).
- **Remediation:** Use file locking (e.g., `proper-lockfile`) or switch to a proper database for production.

### [LOW] Plaintext Password in Environment Variable

- **CWE:** CWE-256 (Plaintext Storage of a Password)
- **File:** `.env.local:3`
- **Description:** `ADMIN_PASSWORD=CyberSec2026Strong!` is stored in plaintext. While server-side only, if an attacker gains file read access they get the password directly.
- **Remediation:** After first run (when admin.json is created with bcrypt hash), remove `ADMIN_PASSWORD` from .env and use `ADMIN_PASSWORD_HASH` with the bcrypt hash instead.

### [LOW] Email Header Injection Potential

- **CWE:** CWE-93 (Improper Neutralization of CRLF)
- **File:** `src/lib/email.ts:86-87`
- **Description:** The contact form `replyTo` field uses `data.email` which is validated by regex but not checked for CRLF characters. Modern nodemailer prevents this, but defense in depth is recommended.
- **Remediation:** Strip `\r\n` from email addresses before passing to nodemailer.

### [LOW] DevTools Blocker is Bypassable

- **CWE:** CWE-602 (Client-Side Enforcement of Server-Side Security)
- **File:** `src/components/DevToolsBlocker.tsx`
- **Description:** Client-side DevTools blocking is a UI deterrent only. Can be bypassed by: (1) opening DevTools before page loads, (2) using browser flags `--auto-open-devtools-for-tabs`, (3) using browser extensions, (4) using remote debugging.
- **Impact:** None — this is defense-in-depth. Real security is server-side.
- **Remediation:** Keep as deterrent but don't rely on it for actual security. Consider adding CSP to make DevTools-based XSS harder.

### [INFO] Session Token in sessionStorage

- **Description:** JWT stored in sessionStorage is accessible to any JavaScript running on the page. If XSS is achieved, token is compromised. HttpOnly cookies would be more secure but complicate the SPA architecture.
- **Mitigation:** CSP header (once added) significantly reduces XSS risk.

### [INFO] Console.log Security Events

- **Description:** Security events logged to console.log. In production, consider structured logging to a persistent store.
- **Mitigation:** Firebase logging provides backup.

### [INFO] Timing Side-Channel on Email Check

- **File:** `src/lib/password.ts:141-142`
- **Description:** `email === admin.email` is not constant-time. A timing attack could theoretically determine if an email is valid. However, the forgot-password endpoint already mitigates this by always returning success.
- **Impact:** Negligible in practice.

---

## Security Hardening Recommendations

1. **[APPLIED] Fix X-Forwarded-For trust** — Only use forwarded headers behind known proxies
2. **[APPLIED] Add CSP header** — Strict policy blocking inline scripts
3. **[APPLIED] Prototype pollution guard** — Strip `__proto__`/`constructor`/`prototype` from all user input
4. **[APPLIED] Body size limit** — Reject requests >1MB
5. **[RECOMMENDED]** Add CAPTCHA to contact form for production
6. **[RECOMMENDED]** Add email verification for DPDPA erasure requests
7. **[RECOMMENDED]** Use file locking for concurrent access protection
8. **[RECOMMENDED]** Remove plaintext ADMIN_PASSWORD from .env after first run

---

## What's Already Done Well

- ✅ **bcrypt(12)** password hashing — industry standard
- ✅ **JWT HS256 with algorithm pinning** — prevents alg:none attacks
- ✅ **72+ character JWT secret** — exceeds minimum recommendations
- ✅ **Comprehensive input sanitization** — HTML entity encoding on all fields
- ✅ **Injection pattern detection** — XSS, SQLi, template injection, null bytes
- ✅ **Path traversal prevention** — VALID_FILES allowlist in db.ts
- ✅ **Security headers** — HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- ✅ **CORS restricted** — Only configured origin, no wildcard
- ✅ **Account lockout** — 5 attempts / 15min lockout with email alerts
- ✅ **HMAC-SHA256 reset tokens** — Hashed before storage, single-use, time-limited
- ✅ **Atomic file writes** — tmp + rename prevents corruption
- ✅ **URL validation** — Prevents javascript: URI injection
- ✅ **DPDPA compliance** — Consent required, 90-day retention, right to erasure
- ✅ **Security event logging** — All auth events, CRUD operations, injection attempts
- ✅ **Email alerts** — Lockouts, password changes, suspicious activity
- ✅ **Sudo verification** — Terminal-style delete confirmation
- ✅ **Session management** — 2h JWT expiry, 30min idle timeout, periodic revalidation
- ✅ **No stack traces in responses** — Generic error messages only
- ✅ **poweredByHeader: false** — No framework version disclosure
- ✅ **Sensitive data redaction** — Emails logged as [redacted]
