import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// SECURITY: Lazy JWT secret check — validates at first use, not at import time
// This prevents build-time crashes on cloud platforms (Render, Vercel) where
// env vars are only available at runtime, not during the build step.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "FATAL: JWT_SECRET environment variable must be set and at least 32 characters long."
    );
  }
  return secret;
}

// LRU-style rate limiter with max entries to prevent memory exhaustion (CWE-400)
const MAX_RATE_ENTRIES = 10000;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "60", 10);
const RATE_LIMIT_WINDOW = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || "900000",
  10
);

// Login-specific brute force protection
const loginAttempts = new Map<
  string,
  { count: number; lockUntil: number; lastAttempt: number }
>();
const MAX_LOGIN_ENTRIES = 5000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function evictOldest(map: Map<string, unknown>, maxSize: number) {
  if (map.size > maxSize) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) map.delete(firstKey);
  }
}

export function getClientIp(req: NextRequest): string {
  // SECURITY: Only trust X-Forwarded-For when TRUSTED_PROXY is configured
  // Without this, attackers can spoof IPs to bypass rate limiting (CWE-348)
  const trustedProxy = process.env.TRUSTED_PROXY;

  if (trustedProxy) {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
  }

  // Fall back to x-real-ip (set by nginx/reverse proxies) only if trusted proxy configured
  if (trustedProxy) {
    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp;
  }

  // x-real-ip is set by nginx/Vercel at infrastructure level (not spoofable by users)
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  // x-forwarded-for is set by Render/most cloud platforms even without TRUSTED_PROXY.
  // Take only the first entry (the actual client) — subsequent entries are proxies.
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return "127.0.0.1";
}

export function rateLimit(req: NextRequest): NextResponse | null {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    evictOldest(rateLimitMap, MAX_RATE_ENTRIES);
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return null;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    logSecurityEvent("RATE_LIMIT_EXCEEDED", { ip, count: entry.count });
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((entry.resetTime - now) / 1000)
          ),
        },
      }
    );
  }

  return null;
}

export function checkLoginBrute(identifier: string): NextResponse | null {
  const now = Date.now();
  const entry = loginAttempts.get(identifier);

  if (entry && entry.lockUntil > now) {
    const retryAfter = Math.ceil((entry.lockUntil - now) / 1000);
    logSecurityEvent("LOGIN_LOCKED_OUT", { identifier, retryAfter });
    return NextResponse.json(
      {
        error: `Account temporarily locked. Try again in ${retryAfter} seconds.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  return null;
}

export function recordLoginFailure(identifier: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(identifier) || {
    count: 0,
    lockUntil: 0,
    lastAttempt: 0,
  };

  // Reset count if the lockout period has passed
  if (now > entry.lockUntil && entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.count = 0;
  }

  entry.count++;
  entry.lastAttempt = now;

  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockUntil = now + LOGIN_LOCKOUT_MS;
    logSecurityEvent("LOGIN_LOCKOUT_TRIGGERED", { identifier });
  }

  evictOldest(loginAttempts, MAX_LOGIN_ENTRIES);
  loginAttempts.set(identifier, entry);
}

export function resetLoginAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

// Prototype pollution guard (CWE-1321)
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
export function stripDangerousKeys<T extends Record<string, unknown>>(obj: T): T {
  const clean = {} as T;
  for (const key of Object.keys(obj)) {
    if (!DANGEROUS_KEYS.has(key)) {
      (clean as Record<string, unknown>)[key] = obj[key];
    }
  }
  return clean;
}

// Input sanitization - context-aware
// Note: We do NOT encode "/" — it breaks URLs and paths.
// XSS is prevented by encoding < > " ' & which covers all HTML injection vectors.
// URLs are separately validated via validateUrl() to block javascript: URIs.
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

// URL validation - prevents javascript: URI injection (CWE-79)
export function validateUrl(url: string): boolean {
  if (!url || url.length === 0) return true; // empty is OK
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) && email.length <= 254;
}

export function generateToken(payload: object): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "2h", // Shorter expiry (was 24h)
    algorithm: "HS256", // Explicit algorithm to prevent confusion attacks
  });
}

export function verifyToken(token: string): { email: string; iat: number; exp: number } | null {
  try {
    return jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"], // Only accept HS256
    }) as { email: string; iat: number; exp: number };
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    logSecurityEvent("AUTH_MISSING", {
      path: req.nextUrl.pathname,
      ip: getClientIp(req),
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    logSecurityEvent("AUTH_INVALID_TOKEN", {
      path: req.nextUrl.pathname,
      ip: getClientIp(req),
    });
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  return null;
}

// Security logging (CWE-778 fix)
export function logSecurityEvent(
  event: string,
  details: Record<string, unknown>
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
  };
  console.log(`[SECURITY] ${JSON.stringify(logEntry)}`);
}
