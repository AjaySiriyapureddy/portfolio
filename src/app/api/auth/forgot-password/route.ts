import { NextRequest, NextResponse } from "next/server";
import { rateLimit, logSecurityEvent, getClientIp } from "@/lib/security";
import { generateResetToken, getWinerEmail } from "@/lib/password";
import { sendPasswordResetEmail } from "@/lib/email";

// Strict rate limit for forgot password — 3 requests per hour per IP
const forgotRateMap = new Map<string, { count: number; resetTime: number }>();
const MAX_FORGOT_REQUESTS = 3;
const FORGOT_WINDOW = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const ip = getClientIp(req);

  // Extra strict rate limiting for password reset
  const now = Date.now();
  const entry = forgotRateMap.get(ip);
  if (entry && now < entry.resetTime && entry.count >= MAX_FORGOT_REQUESTS) {
    logSecurityEvent("FORGOT_PASSWORD_RATE_LIMITED", { ip });
    return NextResponse.json(
      { error: "Too many reset requests. Try again later." },
      { status: 429 }
    );
  }
  if (!entry || now >= entry.resetTime) {
    forgotRateMap.set(ip, { count: 1, resetTime: now + FORGOT_WINDOW });
  } else {
    entry.count++;
  }

  try {
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // ALWAYS return success to prevent email enumeration
    const genericResponse = NextResponse.json({
      success: true,
      message:
        "If this email is associated with an account, you will receive a password reset link shortly.",
    });

    logSecurityEvent("FORGOT_PASSWORD_REQUEST", { ip, email: "[redacted]" });

    try {
      const result = generateResetToken(email);

      if (result.token) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
        const resetUrl = `${siteUrl}/reset-password?token=${result.token}`;

        const adminEmail = getWinerEmail();
        await sendPasswordResetEmail(adminEmail, result.token, resetUrl);

        logSecurityEvent("RESET_TOKEN_GENERATED", { ip });
      }
    } catch (err) {
      // Log but don't expose internal errors (still return generic response)
      console.error("[FORGOT_PASSWORD] Internal error:", err);
    }

    return genericResponse;
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
