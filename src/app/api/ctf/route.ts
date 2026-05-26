import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  rateLimit,
  requireAuth,
  sanitizeInput,
  logSecurityEvent,
  getClientIp,
  stripDangerousKeys,
} from "@/lib/security";
import { sendContentChangeNotification } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const entries = db.ctf.getAll();
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const authError = requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();

    const entry = {
      id: uuidv4(),
      name: sanitizeInput((body.name || "").trim()),
      description: sanitizeInput((body.description || "").trim()),
      difficulty: sanitizeInput((body.difficulty || "Intermediate").trim()),
      category: sanitizeInput((body.category || "").trim()),
      platform: sanitizeInput((body.platform || "").trim()),
      createdAt: new Date().toISOString().split("T")[0],
    };

    if (!entry.name || !entry.description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    db.ctf.create(entry);
    logSecurityEvent("CTF_CREATED", { id: entry.id, ip: getClientIp(req) });
    return NextResponse.json(entry, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
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
      return NextResponse.json({ error: "CTF ID is required" }, { status: 400 });
    }

    const rawData = stripDangerousKeys(unsafeData);
    const data: Record<string, unknown> = {};
    if (rawData.name) data.name = sanitizeInput(rawData.name as string);
    if (rawData.description) data.description = sanitizeInput(rawData.description as string);
    if (rawData.difficulty) data.difficulty = sanitizeInput(rawData.difficulty as string);
    if (rawData.category) data.category = sanitizeInput(rawData.category as string);
    if (rawData.platform) data.platform = sanitizeInput(rawData.platform as string);

    const updated = db.ctf.update(id, data);
    if (!updated) {
      return NextResponse.json({ error: "CTF entry not found" }, { status: 404 });
    }

    logSecurityEvent("CTF_UPDATED", { id, ip: getClientIp(req) });
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
    return NextResponse.json({ error: "CTF ID is required" }, { status: 400 });
  }

  const deleted = db.ctf.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: "CTF entry not found" }, { status: 404 });
  }

  logSecurityEvent("CTF_DELETED", { id, ip: getClientIp(req) });
  return NextResponse.json({ success: true });
}
