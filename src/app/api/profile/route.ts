import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireAuth,
  sanitizeInput,
  validateUrl,
  logSecurityEvent,
  getClientIp,
} from "@/lib/security";

export async function GET() {
  const profile = db.profile.get();
  // Return public-safe subset only (don't expose admin email)
  return NextResponse.json({
    name: profile.name,
    title: profile.title,
    bio: profile.bio,
    location: profile.location,
    avatar: profile.avatar,
    social: profile.social,
    email: profile.email, // This is the public contact email, not admin
  });
}

export async function PUT(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const sanitized: Record<string, unknown> = {};

    if (body.name) sanitized.name = sanitizeInput(body.name);
    if (body.title) sanitized.title = sanitizeInput(body.title);
    if (body.bio) sanitized.bio = sanitizeInput(body.bio);
    if (body.email) sanitized.email = sanitizeInput(body.email);
    if (body.location) sanitized.location = sanitizeInput(body.location);

    // Sanitize nested social URLs (CWE-79 fix)
    if (body.social) {
      const social: Record<string, string> = {};
      for (const key of ["github", "linkedin", "twitter"]) {
        if (body.social[key]) {
          if (!validateUrl(body.social[key])) {
            return NextResponse.json(
              { error: `Invalid URL for ${key}` },
              { status: 400 }
            );
          }
          social[key] = sanitizeInput(body.social[key]);
        }
      }
      sanitized.social = social;
    }

    // Validate resumeUrl and avatar
    if (body.resumeUrl) {
      if (
        !body.resumeUrl.startsWith("/") &&
        !validateUrl(body.resumeUrl)
      ) {
        return NextResponse.json(
          { error: "Invalid resume URL" },
          { status: 400 }
        );
      }
      sanitized.resumeUrl = sanitizeInput(body.resumeUrl);
    }
    if (body.avatar) {
      sanitized.avatar = sanitizeInput(body.avatar);
    }

    const updated = db.profile.update(sanitized);
    logSecurityEvent("PROFILE_UPDATED", { ip: getClientIp(req) });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
