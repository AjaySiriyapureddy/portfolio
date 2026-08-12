// In-process async job execution for the Bug Hunting tool.
//
// Next.js here runs as a persistent Node server (`next start` on Render, not
// serverless functions), so an API route can kick off this async function
// and return immediately while it keeps running in the Node event loop.
// Progress is polled by the browser (GET /api/admin/bughunt/jobs/[id]) rather
// than streamed — consistent with the panel's existing polling pattern
// (5-min JWT re-verify interval in x9k3/page.tsx).
//
// Known scaling limit (documented, not solved): this in-memory state is
// single-instance only. If this service ever runs as more than one Render
// instance, a poll could land on an instance that isn't running the job —
// the persisted Firestore/JSON record is always the source of truth once a
// job finishes, so this only affects *live* progress visibility mid-run.

import { v4 as uuidv4 } from "uuid";
import { db, BugHuntJob } from "@/lib/db";
import { logSecurityEvent } from "@/lib/security";
import { getModule } from "./modules";
import { makeContext } from "./modules/base";
import { isInScope } from "./scope";

const REDACT_KEYS = ["token", "secret", "password", "authorization", "api_key", "apikey"];

function redactParams(params: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    out[k] = REDACT_KEYS.some((r) => k.toLowerCase().includes(r)) ? "***" : v;
  }
  return out;
}

interface LiveJobState {
  lines: string[];
  status: "running" | "completed" | "failed";
  result: Record<string, unknown> | null;
}

const activeJobs = new Map<string, LiveJobState>();

const MAX_CONCURRENT_GLOBAL = 5;
let globalActive = 0;

export class ScopeRejectedError extends Error {}
export class ConcurrencyLimitError extends Error {}
export class UnknownModuleError extends Error {}

export interface StartJobOptions {
  engagementId: string;
  scopeIn: string[];
  scopeOut: string[];
  moduleId: string;
  target: string;
  params: Record<string, string>;
}

export async function startJob(opts: StartJobOptions): Promise<BugHuntJob> {
  const moduleEntry = getModule(opts.moduleId);
  if (!moduleEntry) {
    throw new UnknownModuleError(`Unknown module: ${opts.moduleId}`);
  }

  const inScope = isInScope(opts.target, { scopeIn: opts.scopeIn, scopeOut: opts.scopeOut });
  const now = new Date().toISOString();

  const job: BugHuntJob = {
    id: uuidv4(),
    engagementId: opts.engagementId,
    moduleId: opts.moduleId,
    target: opts.target,
    params: redactParams(opts.params),
    status: inScope ? "queued" : "rejected",
    scopeVerdict: inScope ? "in_scope" : "out_of_scope",
    logText: "",
    resultJson: null,
    startedAt: null,
    finishedAt: inScope ? null : now,
    createdAt: now,
  };

  await db.bugHuntJobs.create(job);

  if (!inScope) {
    logSecurityEvent("BUGHUNT_SCOPE_REJECTED", {
      engagementId: opts.engagementId,
      target: opts.target,
      moduleId: opts.moduleId,
    });
    throw new ScopeRejectedError(`'${opts.target}' is not within the engagement's declared scope`);
  }

  if (globalActive >= MAX_CONCURRENT_GLOBAL) {
    await db.bugHuntJobs.update(job.id, { status: "rejected", finishedAt: new Date().toISOString() });
    throw new ConcurrencyLimitError("Too many concurrent jobs — try again shortly");
  }

  activeJobs.set(job.id, { lines: [], status: "running", result: null });
  void runJob(job.id, opts.moduleId, opts.target, opts.params);

  return job;
}

async function runJob(
  jobId: string,
  moduleId: string,
  target: string,
  params: Record<string, string>
): Promise<void> {
  globalActive++;
  const state = activeJobs.get(jobId);
  if (!state) {
    globalActive--;
    return;
  }

  await db.bugHuntJobs.update(jobId, { status: "running", startedAt: new Date().toISOString() });

  const moduleEntry = getModule(moduleId);
  const ctx = makeContext();
  let exitStatus: "completed" | "failed" = "completed";

  try {
    if (!moduleEntry) throw new Error(`Unknown module: ${moduleId}`);
    for await (const line of moduleEntry.run(target, params, ctx)) {
      state.lines.push(line);
    }
  } catch (err) {
    state.lines.push(`[ERR] Module raised an exception: ${err instanceof Error ? err.message : String(err)}`);
    exitStatus = "failed";
  } finally {
    globalActive--;
  }

  state.status = exitStatus;
  state.result = ctx.result;

  await db.bugHuntJobs.update(jobId, {
    status: exitStatus,
    finishedAt: new Date().toISOString(),
    logText: state.lines.join("\n"),
    resultJson: ctx.result,
  });

  logSecurityEvent("BUGHUNT_JOB_FINISHED", { jobId, moduleId, target, status: exitStatus });

  // Keep the live state around briefly for a straggling poll, then drop it —
  // the persisted record is the durable copy from here on.
  setTimeout(() => activeJobs.delete(jobId), 5 * 60 * 1000);
}

export async function getJobView(jobId: string): Promise<BugHuntJob | null> {
  const persisted = await db.bugHuntJobs.getById(jobId);
  if (!persisted) return null;
  const live = activeJobs.get(jobId);
  if (!live) return persisted;
  return {
    ...persisted,
    status: live.status,
    logText: live.lines.join("\n"),
    resultJson: live.result ?? persisted.resultJson,
  };
}
