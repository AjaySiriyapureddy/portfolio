import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, requireAuth, sanitizeInput, logSecurityEvent, getClientIp, stripDangerousKeys } from "@/lib/security";
import { parseTargetsFromText, parseOosFromText } from "@/lib/bughunt/scope";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;

  const engagements = await db.bugHuntEngagements.getAll();
  return NextResponse.json(engagements);
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const authError = requireAuth(req);
  if (authError) return authError;

  try {
    const body = stripDangerousKeys(await req.json());
    const name = sanitizeInput((body.name as string) || "").slice(0, 200) || "Untitled engagement";
    const scopeText = ((body.scopeText as string) || "").slice(0, 20000);
    const outOfScopeText = ((body.outOfScopeText as string) || "").slice(0, 20000);

    if (!scopeText.trim()) {
      return NextResponse.json({ error: "scopeText is required" }, { status: 400 });
    }

    const scopeIn = parseTargetsFromText(scopeText);
    if (scopeIn.length === 0) {
      return NextResponse.json(
        { error: "Could not extract any valid targets from the scope text — check the format and try again." },
        { status: 400 }
      );
    }
    const scopeOut = outOfScopeText.trim() ? parseOosFromText(outOfScopeText) : [];

    const engagement = {
      id: uuidv4(),
      name,
      scopeText,
      outOfScopeText,
      scopeIn,
      scopeOut,
      createdAt: new Date().toISOString(),
    };

    await db.bugHuntEngagements.create(engagement);
    logSecurityEvent("BUGHUNT_ENGAGEMENT_CREATED", { id: engagement.id, ip: getClientIp(req) });
    return NextResponse.json(engagement, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
