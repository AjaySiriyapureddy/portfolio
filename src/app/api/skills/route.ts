import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, requireAuth, sanitizeInput, logSecurityEvent, getClientIp } from "@/lib/security";
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
    return NextResponse.json(skill, { status: 201 });
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
  return NextResponse.json({ success: true });
}
