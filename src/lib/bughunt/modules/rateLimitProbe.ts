// Adaptive rate limiting detector — OWASP A07:2021 Identification and
// Authentication Failures, CWE-307. Doc §6.9.
//
// Deliberately NOT a fixed concurrent burst. Starts with a gentle sequential
// pace, watches the target's own behavior (429/503, Retry-After, latency
// spikes relative to baseline), and only escalates to a faster pace if the
// target shows no sign of throttling — stopping at the first signal rather
// than always maxing out. Still capped (requests and wall-clock time) so
// it can't run away, but the cap is a safety ceiling, not the target.

import { JobContext, ModuleMeta, safeFetch, validateTargetUrl } from "./base";

export const meta: ModuleMeta = {
  id: "rate_limit_probe",
  name: "Adaptive Rate Limiting Detector",
  description: "Sequential, interval-based probing that escalates pace only if the target shows no throttling signal — stops at the first sign of one instead of maxing out a fixed burst.",
  riskTier: "active",
};

const INTERVAL_STEPS_MS = [400, 200, 100, 50, 25];
const BATCH_PER_STEP = 5;
const MAX_TOTAL_REQUESTS = 40;
const MAX_WALL_CLOCK_MS = 20_000;
const LATENCY_SPIKE_MULTIPLIER = 3;

interface StepResult {
  status: number | null;
  latencyMs: number;
  retryAfter: string | null;
}

export async function* run(
  targetRaw: string,
  params: Record<string, string>,
  ctx: JobContext
): AsyncGenerator<string> {
  const target = validateTargetUrl(targetRaw);
  const method = (params.method || "POST").toUpperCase();
  const body = params.body ?? "{}";

  yield "=== ADAPTIVE RATE LIMITING DETECTOR ===";
  yield `Target: ${target}`;
  yield `Method: ${method}`;
  yield "Behavior: starts gentle, escalates pace only while the target shows no throttling signal, stops at the first sign of one";
  yield "=========================================";

  const startTime = Date.now();
  let totalSent = 0;
  const timeline: Array<{ intervalMs: number; results: StepResult[] }> = [];
  const findings: Array<Record<string, unknown>> = [];

  async function fireOne(): Promise<StepResult> {
    const t0 = Date.now();
    const resp = await safeFetch(target, ctx, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "GET" ? undefined : body,
    });
    totalSent++;
    return {
      status: resp?.status ?? null,
      latencyMs: Date.now() - t0,
      retryAfter: resp?.headers.get("retry-after") ?? null,
    };
  }

  yield "";
  yield "[*] Baseline request";
  const baseline = await fireOne();
  yield `    status ${baseline.status ?? "no response"}, ${baseline.latencyMs}ms`;

  let throttleSignal: Record<string, unknown> | null = null;
  let lastIntervalTested: number | null = null;
  let cappedEarly = false;

  for (const interval of INTERVAL_STEPS_MS) {
    if (totalSent >= MAX_TOTAL_REQUESTS || Date.now() - startTime > MAX_WALL_CLOCK_MS) {
      cappedEarly = true;
      break;
    }

    yield "";
    yield `[*] Probing at ~${interval}ms interval (up to ${BATCH_PER_STEP} requests)`;
    const stepResults: StepResult[] = [];

    for (let i = 0; i < BATCH_PER_STEP; i++) {
      if (totalSent >= MAX_TOTAL_REQUESTS || Date.now() - startTime > MAX_WALL_CLOCK_MS) {
        cappedEarly = true;
        break;
      }

      const result = await fireOne();
      lastIntervalTested = interval;
      stepResults.push(result);
      yield `    #${totalSent} status ${result.status ?? "no response"} ${result.latencyMs}ms${
        result.retryAfter ? ` (Retry-After: ${result.retryAfter})` : ""
      }`;

      if (result.status === 429 || result.status === 503) {
        throttleSignal = { type: "throttling_status", intervalMs: interval, status: result.status, retryAfter: result.retryAfter };
        break;
      }
      if (baseline.latencyMs > 20 && result.latencyMs > baseline.latencyMs * LATENCY_SPIKE_MULTIPLIER) {
        throttleSignal = { type: "latency_spike", intervalMs: interval, latencyMs: result.latencyMs, baselineLatencyMs: baseline.latencyMs };
        break;
      }

      await new Promise((r) => setTimeout(r, interval));
    }

    timeline.push({ intervalMs: interval, results: stepResults });
    if (throttleSignal) break;
  }

  yield "";
  if (throttleSignal) {
    yield `[OK] Throttling signal detected (${throttleSignal.type}) at ~${throttleSignal.intervalMs}ms interval`;
    yield `    Stopped after ${totalSent} total requests — adaptive probing didn't need to reach the cap`;
  } else {
    const reachedFullDepth = !cappedEarly && lastIntervalTested === INTERVAL_STEPS_MS[INTERVAL_STEPS_MS.length - 1];
    yield `[VULN] No throttling signal across ${totalSent} requests, down to ~${lastIntervalTested ?? baseline.latencyMs}ms interval` +
      (cappedEarly ? " (stopped by the request/time safety cap, not because the target showed a signal)" : "");
    findings.push({
      severity: "MEDIUM",
      check: "missing_rate_limit",
      totalRequests: totalSent,
      minIntervalTestedMs: lastIntervalTested,
      reachedFullTestDepth: reachedFullDepth,
      cappedEarly,
    });
  }

  ctx.result.findings = findings;
  ctx.result.timeline = timeline;
  yield "";
  yield "=========================================";
  yield findings.length > 0 ? `[VULN] ${findings.length} finding(s)` : "[OK] Rate limiting appears to be in place";
}
