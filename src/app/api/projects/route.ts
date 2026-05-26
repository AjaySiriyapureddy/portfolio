import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  rateLimit,
  requireAuth,
  sanitizeInput,
  validateUrl,
  logSecurityEvent,
  getClientIp,
  stripDangerousKeys,
} from "@/lib/security";
import { sendContentChangeNotification } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const projects = db.projects.getAll();
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const authError = requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();

    const liveUrl = (body.liveUrl || "").trim();
    const githubUrl = (body.githubUrl || "").trim();

    // Validate URLs to prevent javascript: URI injection (CWE-79)
    if (!validateUrl(liveUrl) || !validateUrl(githubUrl)) {
      return NextResponse.json(
        { error: "URLs must use http:// or https:// protocol" },
        { status: 400 }
      );
    }

    const project = {
      id: uuidv4(),
      title: sanitizeInput(body.title || ""),
      description: sanitizeInput(body.description || ""),
      image: sanitizeInput(body.image || "/projects/default.svg"),
      tags: (body.tags || []).map((t: string) => sanitizeInput(t)),
      liveUrl: sanitizeInput(liveUrl),
      githubUrl: sanitizeInput(githubUrl),
      featured: Boolean(body.featured),
      createdAt: new Date().toISOString().split("T")[0],
    };

    if (!project.title || !project.description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    db.projects.create(project);
    logSecurityEvent("PROJECT_CREATED", {
      id: project.id,
      ip: getClientIp(req),
    });
    sendContentChangeNotification({ action: "created", contentType: "Project", title: project.title, ip: getClientIp(req) }).catch(() => {});
    return NextResponse.json(project, { status: 201 });
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
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Strip prototype pollution keys (CWE-1321) then sanitize
    const rawData = stripDangerousKeys(unsafeData);
    const data: Record<string, unknown> = {};
    if (rawData.title) data.title = sanitizeInput(rawData.title);
    if (rawData.description) data.description = sanitizeInput(rawData.description);
    if (rawData.image) data.image = sanitizeInput(rawData.image);
    if (rawData.tags) data.tags = rawData.tags.map((t: string) => sanitizeInput(t));
    if (rawData.liveUrl !== undefined) {
      if (!validateUrl(rawData.liveUrl)) {
        return NextResponse.json(
          { error: "URLs must use http:// or https:// protocol" },
          { status: 400 }
        );
      }
      data.liveUrl = sanitizeInput(rawData.liveUrl);
    }
    if (rawData.githubUrl !== undefined) {
      if (!validateUrl(rawData.githubUrl)) {
        return NextResponse.json(
          { error: "URLs must use http:// or https:// protocol" },
          { status: 400 }
        );
      }
      data.githubUrl = sanitizeInput(rawData.githubUrl);
    }
    if (typeof rawData.featured === "boolean") data.featured = rawData.featured;

    const updated = db.projects.update(id, data);
    if (!updated) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    logSecurityEvent("PROJECT_UPDATED", { id, ip: getClientIp(req) });
    sendContentChangeNotification({ action: "updated", contentType: "Project", title: (data.title as string) || id, ip: getClientIp(req) }).catch(() => {});
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 }
    );
  }

  const deleted = db.projects.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  logSecurityEvent("PROJECT_DELETED", { id, ip: getClientIp(req) });
  sendContentChangeNotification({ action: "deleted", contentType: "Project", title: id, ip: getClientIp(req) }).catch(() => {});
  return NextResponse.json({ success: true });
}
