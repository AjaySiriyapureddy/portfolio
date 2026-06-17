import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, requireAuth, sanitizeInput, stripDangerousKeys, logSecurityEvent, getClientIp } from "@/lib/security";
import { sendContentChangeNotification } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const skills = db.skills.getAll();
  return NextResponse.json(skills);
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const authError = requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const skill = {
      id: uuidv4(),
      name: sanitizeInput(body.name || ""),
      category: sanitizeInput(body.category || ""),
      proficiency: Math.min(100, Math.max(0, parseInt(body.proficiency, 10) || 0)),
    };

    if (!skill.name || !skill.category) {
      return NextResponse.json(
        { error: "Name and category are required" },
        { status: 400 }
      );
    }

    db.skills.create(skill);
    logSecurityEvent("SKILL_CREATED", { id: skill.id, ip: getClientIp(req) });
    sendContentChangeNotification({ action: "created", contentType: "Skill", title: skill.name, ip: getClientIp(req) }).catch(() => {});
    return NextResponse.json(skill, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const authError = requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id, ...unsafeData } = body;
    if (!id) {
      return NextResponse.json({ error: "Skill ID is required" }, { status: 400 });
    }

    const rawData = stripDangerousKeys(unsafeData);
    const data: Record<string, unknown> = {};
    if (rawData.name) data.name = sanitizeInput(rawData.name);
    if (rawData.category) data.category = sanitizeInput(rawData.category);
    if (rawData.proficiency !== undefined) {
      data.proficiency = Math.min(100, Math.max(0, parseInt(rawData.proficiency as string, 10) || 0));
    }

    const updated = db.skills.update(id, data);
    if (!updated) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    logSecurityEvent("SKILL_UPDATED", { id, ip: getClientIp(req) });
    sendContentChangeNotification({ action: "updated", contentType: "Skill", title: updated.name, ip: getClientIp(req) }).catch(() => {});
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Skill ID is required" }, { status: 400 });
  }

  const deleted = db.skills.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }
  logSecurityEvent("SKILL_DELETED", { id, ip: getClientIp(req) });
  sendContentChangeNotification({ action: "deleted", contentType: "Skill", title: id, ip: getClientIp(req) }).catch(() => {});
  return NextResponse.json({ success: true });
}
