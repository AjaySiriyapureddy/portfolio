import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, requireAuth, logSecurityEvent, getClientIp, stripDangerousKeys } from "@/lib/security";
import { getModule } from "@/lib/bughunt/modules";
import { ConcurrencyLimitError, ScopeRejectedError, UnknownModuleError, startJob } from "@/lib/bughunt/runner";

export async function GET(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;

  const engagementId = req.nextUrl.searchParams.get("engagementId");
  if (!engagementId) {
    return NextResponse.json({ error: "engagementId query param is required" }, { status: 400 });
  }
  const jobs = await db.bugHuntJobs.getByEngagement(engagementId);
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const authError = requireAuth(req);
  if (authError) return authError;

  try {
    const body = stripDangerousKeys(await req.json());
    const engagementId = (body.engagementId as string) || "";
    const moduleId = (body.moduleId as string) || "";
    const target = ((body.target as string) || "").trim();
    const params = (body.params as Record<string, string>) || {};

    if (!engagementId || !moduleId || !target) {
      return NextResponse.json({ error: "engagementId, moduleId, and target are required" }, { status: 400 });
    }

    if (!getModule(moduleId)) {
      return NextResponse.json({ error: `Unknown module: ${moduleId}` }, { status: 400 });
    }

    const engagement = await db.bugHuntEngagements.getById(engagementId);
    if (!engagement) {
      return NextResponse.json({ error: "Engagement not found" }, { status: 404 });
    }

    const job = await startJob({
      engagementId,
      scopeIn: engagement.scopeIn,
      scopeOut: engagement.scopeOut,
      moduleId,
      target,
      params,
    });

    logSecurityEvent("BUGHUNT_JOB_STARTED", { jobId: job.id, moduleId, target, ip: getClientIp(req) });
    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    if (err instanceof ScopeRejectedError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ConcurrencyLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof UnknownModuleError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
