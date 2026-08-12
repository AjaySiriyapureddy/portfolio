import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, requireAuth, validateUrl, logSecurityEvent, getClientIp, stripDangerousKeys } from "@/lib/security";
import { isInScope } from "@/lib/bughunt/scope";
import { classifyTarget } from "@/lib/bughunt/classify";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const authError = requireAuth(req);
  if (authError) return authError;

  try {
    const body = stripDangerousKeys(await req.json());
    const engagementId = (body.engagementId as string) || "";
    const target = ((body.target as string) || "").trim();

    if (!validateUrl(target) || !target) {
      return NextResponse.json({ error: "target must be a valid http(s):// URL" }, { status: 400 });
    }

    const engagement = await db.bugHuntEngagements.getById(engagementId);
    if (!engagement) {
      return NextResponse.json({ error: "Engagement not found" }, { status: 404 });
    }

    const inScope = isInScope(target, { scopeIn: engagement.scopeIn, scopeOut: engagement.scopeOut });
    if (!inScope) {
      logSecurityEvent("BUGHUNT_CLASSIFY_SCOPE_REJECTED", { engagementId, target, ip: getClientIp(req) });
      return NextResponse.json({ error: `'${target}' is not within the engagement's declared scope` }, { status: 400 });
    }

    const result = await classifyTarget(target);
    logSecurityEvent("BUGHUNT_CLASSIFY", { engagementId, target, type: result.type, ip: getClientIp(req) });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
