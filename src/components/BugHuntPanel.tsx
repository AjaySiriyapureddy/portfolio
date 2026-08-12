"use client";

import { useCallback, useEffect, useRef, useState, FormEvent } from "react";

const mono = "font-[family-name:var(--font-mono)]";
const inputCls =
  "w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50 font-[family-name:var(--font-mono)]";

interface Engagement {
  id: string;
  name: string;
  scopeIn: string[];
  scopeOut: string[];
  createdAt: string;
}

interface ClassificationResult {
  type: string;
  label: string;
  confidence: "high" | "medium" | "low";
  signals: string[];
  docReference: string;
  recommendedModules: string[];
}

interface Job {
  id: string;
  engagementId: string;
  moduleId: string;
  target: string;
  status: "queued" | "running" | "completed" | "failed" | "rejected";
  scopeVerdict: "in_scope" | "out_of_scope";
  logText: string;
  resultJson: { findings?: Array<Record<string, unknown>>; techManifest?: Array<Record<string, unknown>> } | null;
  createdAt: string;
}

const MODULE_LABELS: Record<string, string> = {
  cors_check: "CORS Misconfiguration Tester",
  jwt_audit: "JWT Attack Suite",
  ssrf_probe: "SSRF Exploiter & Cloud Metadata Extractor",
  idor_probe: "Parallel IDOR Prober",
  tech_fingerprint: "Technology Fingerprinting",
  subdomain_takeover_check: "Subdomain Takeover Scanner",
  sqli_probe: "SQL / NoSQL Injection Detector",
  xss_probe: "Reflected XSS Detector",
  ssti_probe: "Server-Side Template Injection Detector",
  open_redirect_probe: "Open Redirect Detector",
  path_traversal_probe: "Path Traversal Detector",
  security_headers_audit: "Security Headers & Cookie Audit",
  mass_assignment_probe: "Mass Assignment Detector",
  xxe_probe: "XXE (XML External Entity) Detector",
  rate_limit_probe: "Adaptive Rate Limiting Detector",
  file_upload_probe: "File Upload Validation Tester",
  role_matrix_probe: "Cross-Role Access Control Matrix",
};

// Modules whose real-world impact goes beyond "sends some HTTP requests" —
// shown as an extra warning in the UI before running.
const MODULE_WARNINGS: Record<string, string> = {
  rate_limit_probe: "Sends up to ~40 requests, but paces itself and stops as soon as it sees a throttling signal — not a fixed blast.",
  file_upload_probe: "Actually uploads test files to the target — you'll need to manually delete them afterward.",
  role_matrix_probe: "If you include write methods (POST/PUT/PATCH/DELETE), a real broken-access-control finding means a real state change happens — start with GET.",
};

const MODULE_PARAM_FIELDS: Record<string, Array<{ key: string; label: string; placeholder: string; required: boolean }>> = {
  cors_check: [{ key: "token", label: "Bearer token (optional — also tests authenticated endpoints)", placeholder: "eyJhbGciOi...", required: false }],
  jwt_audit: [{ key: "token", label: "JWT token", placeholder: "eyJhbGciOi...", required: true }],
  idor_probe: [
    { key: "token", label: "Attacker bearer token", placeholder: "eyJhbGciOi...", required: true },
    { key: "ids", label: "Victim IDs (optional, comma-separated)", placeholder: "1,2,3,100", required: false },
  ],
  ssrf_probe: [
    { key: "param", label: "Query param carrying the URL", placeholder: "url", required: true },
    { key: "callback", label: "OOB callback URL (optional)", placeholder: "https://your-id.oastify.com", required: false },
  ],
  sqli_probe: [
    { key: "param", label: "Query param to fuzz", placeholder: "id", required: true },
    { key: "jsonKeys", label: "NoSQL JSON body fields (optional, comma-separated)", placeholder: "username,password", required: false },
  ],
  xss_probe: [{ key: "param", label: "Query param to fuzz", placeholder: "q", required: true }],
  ssti_probe: [{ key: "param", label: "Query param to fuzz", placeholder: "name", required: true }],
  open_redirect_probe: [{ key: "param", label: "Redirect param (optional — tests common names if blank)", placeholder: "redirect", required: false }],
  path_traversal_probe: [{ key: "param", label: "File/path query param", placeholder: "file", required: true }],
  mass_assignment_probe: [
    { key: "token", label: "Bearer token", placeholder: "eyJhbGciOi...", required: true },
    { key: "method", label: "HTTP method (optional, default PATCH)", placeholder: "PATCH", required: false },
  ],
  xxe_probe: [{ key: "callback", label: "OOB callback URL (optional)", placeholder: "https://your-id.oastify.com", required: false }],
  rate_limit_probe: [
    { key: "method", label: "HTTP method (optional, default POST)", placeholder: "POST", required: false },
    { key: "body", label: "Request body JSON (optional)", placeholder: '{"username":"test","password":"wrong"}', required: false },
  ],
  file_upload_probe: [
    { key: "fieldName", label: "Multipart field name", placeholder: "file", required: true },
    { key: "token", label: "Bearer token (optional)", placeholder: "eyJhbGciOi...", required: false },
  ],
  role_matrix_probe: [
    {
      key: "tokens",
      label: "Role tokens JSON — first key is the baseline/expected owner",
      placeholder: '{"citizen":"<token>","department":"<token>","admin":"<token>"}',
      required: true,
    },
    { key: "methods", label: "HTTP methods (optional, default GET, comma-separated)", placeholder: "GET", required: false },
  ],
};

function statusBadge(status: Job["status"]) {
  const map: Record<Job["status"], string> = {
    queued: "text-gray-400",
    running: "text-yellow-400",
    completed: "text-green-400",
    failed: "text-red-400",
    rejected: "text-red-400",
  };
  return <span className={map[status]}>{status}</span>;
}

export default function BugHuntPanel({ authHeaders }: { authHeaders: () => Record<string, string> }) {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [newEngagement, setNewEngagement] = useState({ name: "", scopeText: "", outOfScopeText: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [classifyTarget, setClassifyTarget] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState("");
  const [classification, setClassification] = useState<ClassificationResult | null>(null);

  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [moduleParams, setModuleParams] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  const [jobs, setJobs] = useState<Job[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedEngagement = engagements.find((e) => e.id === selectedId) || null;

  const loadJobs = useCallback(
    (engagementId: string) => {
      fetch(`/api/admin/bughunt/jobs?engagementId=${encodeURIComponent(engagementId)}`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((data: Job[]) => setJobs(data))
        .catch(() => {});
    },
    [authHeaders]
  );

  const selectEngagement = useCallback(
    (engagement: Engagement) => {
      setSelectedId(engagement.id);
      loadJobs(engagement.id);
      setClassification(null);
      setSelectedModule(null);
      setModuleParams({});
      setActiveJob(null);
      setClassifyTarget(engagement.scopeIn[0] || "");
    },
    [loadJobs]
  );

  const loadEngagements = useCallback(() => {
    fetch("/api/admin/bughunt/engagements", { headers: authHeaders() })
      .then((r) => r.json())
      .then((data: Engagement[]) => {
        setEngagements(data);
        if (!selectedId && data.length > 0) selectEngagement(data[0]);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHeaders]);

  useEffect(() => {
    loadEngagements();
  }, [loadEngagements]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const createEngagement = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const resp = await fetch("/api/admin/bughunt/engagements", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(newEngagement),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setCreateError(data.error || "Failed to create engagement");
        return;
      }
      setNewEngagement({ name: "", scopeText: "", outOfScopeText: "" });
      setEngagements((prev) => [data, ...prev]);
      selectEngagement(data);
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const runClassify = async () => {
    if (!selectedEngagement || !classifyTarget.trim()) return;
    setClassifying(true);
    setClassifyError("");
    setClassification(null);
    try {
      const resp = await fetch("/api/admin/bughunt/classify", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ engagementId: selectedEngagement.id, target: classifyTarget.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setClassifyError(data.error || "Classification failed");
        return;
      }
      setClassification(data);
    } catch {
      setClassifyError("Network error");
    } finally {
      setClassifying(false);
    }
  };

  const pollJob = useCallback(
    (jobId: string) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const resp = await fetch(`/api/admin/bughunt/jobs/${jobId}`, { headers: authHeaders() });
          if (!resp.ok) return;
          const data: Job = await resp.json();
          setActiveJob(data);
          if (["completed", "failed", "rejected"].includes(data.status)) {
            if (pollRef.current) clearInterval(pollRef.current);
            if (selectedEngagement) loadJobs(selectedEngagement.id);
          }
        } catch {
          /* keep polling */
        }
      }, 1500);
    },
    [authHeaders, loadJobs, selectedEngagement]
  );

  const runModule = async () => {
    if (!selectedEngagement || !selectedModule || !classifyTarget.trim()) return;
    setRunning(true);
    setRunError("");
    try {
      const resp = await fetch("/api/admin/bughunt/jobs", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          engagementId: selectedEngagement.id,
          moduleId: selectedModule,
          target: classifyTarget.trim(),
          params: moduleParams,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setRunError(data.error || "Failed to start job");
        return;
      }
      setActiveJob(data);
      pollJob(data.id);
    } catch {
      setRunError("Network error");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ═══ New engagement ═══ */}
      <form onSubmit={createEngagement} className="bg-[#111] border border-gray-800/50 rounded-xl p-6 space-y-4">
        <h3 className={`text-sm font-semibold text-white ${mono}`}>
          <span className="text-red-500">+</span> New Engagement
        </h3>
        <p className="text-gray-500 text-xs">
          Every job is checked against this scope before anything is sent to a target — targets outside the list are rejected.
        </p>
        <input
          placeholder="e.g. Unnoti UAT citizen portal"
          required
          value={newEngagement.name}
          onChange={(e) => setNewEngagement({ ...newEngagement, name: e.target.value })}
          className={inputCls}
        />
        <p className={`text-[10px] text-gray-600 ${mono} -mt-2`}>&#8593; a label for you — not a target, just a name to find this engagement later</p>

        <div>
          <label className={`block text-xs text-gray-500 mb-1 ${mono}`}>
            In-scope targets <span className="text-red-500">*</span>
          </label>
          <textarea
            placeholder={"The actual URLs/domains you're authorized to test, one per line:\nhttps://unnoti-uat.vaf.ai/citizen-login\n*.vaf.ai"}
            required
            rows={4}
            value={newEngagement.scopeText}
            onChange={(e) => setNewEngagement({ ...newEngagement, scopeText: e.target.value })}
            className={`${inputCls} resize-none`}
          />
          <p className={`text-[10px] text-gray-600 ${mono} mt-1`}>
            This is what every job is checked against — no valid URL/domain/IP in here means nothing can run.
          </p>
        </div>

        <div>
          <label className={`block text-xs text-gray-500 mb-1 ${mono}`}>Out-of-scope (optional)</label>
          <textarea
            placeholder="Exclusions, e.g. staging.vaf.ai"
            rows={2}
            value={newEngagement.outOfScopeText}
            onChange={(e) => setNewEngagement({ ...newEngagement, outOfScopeText: e.target.value })}
            className={`${inputCls} resize-none`}
          />
        </div>
        {createError && <p className={`text-red-400 text-xs ${mono}`}>[ERROR] {createError}</p>}
        <button
          type="submit"
          disabled={creating}
          className={`bg-red-600/90 hover:bg-red-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-xs ${mono} transition-colors`}
        >
          {creating ? "Creating..." : "$ engagement --create"}
        </button>
      </form>

      {/* ═══ Engagement picker ═══ */}
      {engagements.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {engagements.map((e) => (
            <button
              key={e.id}
              onClick={() => selectEngagement(e)}
              className={`px-3 py-1.5 rounded-lg text-xs ${mono} transition-all ${
                selectedId === e.id ? "bg-red-600/90 text-white" : "bg-[#111] text-gray-500 hover:text-white border border-gray-800/50"
              }`}
            >
              {e.name}
            </button>
          ))}
        </div>
      )}

      {selectedEngagement && (
        <>
          {/* ═══ Scope summary ═══ */}
          <div className="bg-[#111] border border-gray-800/50 rounded-xl p-6">
            <h3 className={`text-sm font-semibold text-white ${mono} mb-3`}>{selectedEngagement.name}</h3>
            <div className={`text-xs ${mono} text-gray-400 space-y-1`}>
              <p>
                <span className="text-gray-600">in-scope:</span> {selectedEngagement.scopeIn.join(", ")}
              </p>
              {selectedEngagement.scopeOut.length > 0 && (
                <p>
                  <span className="text-gray-600">out-of-scope:</span> {selectedEngagement.scopeOut.join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* ═══ Classify ═══ */}
          <div className="bg-[#111] border border-gray-800/50 rounded-xl p-6 space-y-4">
            <h3 className={`text-sm font-semibold text-white ${mono}`}>
              <span className="text-yellow-400">?</span> Identify Target Type
            </h3>
            <div className="flex gap-3">
              <input
                placeholder="https://target.example.com/"
                value={classifyTarget}
                onChange={(e) => setClassifyTarget(e.target.value)}
                className={inputCls}
              />
              <button
                onClick={runClassify}
                disabled={classifying || !classifyTarget.trim()}
                className={`bg-yellow-600/80 hover:bg-yellow-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-xs ${mono} whitespace-nowrap transition-colors`}
              >
                {classifying ? "Classifying..." : "$ classify --target"}
              </button>
            </div>
            {classifyError && <p className={`text-red-400 text-xs ${mono}`}>[ERROR] {classifyError}</p>}

            {classification && (
              <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-lg p-4 space-y-3">
                <div className={`text-xs ${mono}`}>
                  <span className="text-gray-600">type:</span>{" "}
                  <span className="text-green-400">{classification.label}</span>{" "}
                  <span className="text-gray-600">({classification.confidence} confidence)</span>
                </div>
                <div className={`text-[11px] text-gray-500 ${mono}`}>{classification.docReference}</div>
                {classification.signals.length > 0 && (
                  <ul className={`text-[11px] text-gray-500 ${mono} space-y-0.5`}>
                    {classification.signals.map((s, i) => (
                      <li key={i}>&#8226; {s}</li>
                    ))}
                  </ul>
                )}
                <div>
                  <p className={`text-[11px] text-gray-600 ${mono} mb-2`}>Recommended modules — pick one to run:</p>
                  <div className="flex flex-wrap gap-2">
                    {classification.recommendedModules.map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setSelectedModule(m);
                          setModuleParams({});
                          setActiveJob(null);
                          setRunError("");
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] ${mono} transition-all ${
                          selectedModule === m
                            ? "bg-green-600/80 text-white"
                            : "bg-[#111] text-gray-400 hover:text-white border border-gray-800/50"
                        }`}
                      >
                        {MODULE_LABELS[m] ?? m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div>
              <p className={`text-[11px] text-gray-600 ${mono} mb-2`}>
                Advanced — run any module directly (not limited to recommendations):
              </p>
              <select
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  setSelectedModule(e.target.value);
                  setModuleParams({});
                  setActiveJob(null);
                  setRunError("");
                }}
                className={inputCls}
              >
                <option value="">Select a module...</option>
                {Object.keys(MODULE_LABELS).map((m) => (
                  <option key={m} value={m}>
                    {MODULE_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ═══ Run module ═══ */}
          {selectedModule && (
            <div className="bg-[#111] border border-gray-800/50 rounded-xl p-6 space-y-4">
              <h3 className={`text-sm font-semibold text-white ${mono}`}>
                <span className="text-green-400">&#9654;</span> {MODULE_LABELS[selectedModule]}
              </h3>
              <p className={`text-[11px] text-gray-500 ${mono}`}>target: {classifyTarget}</p>
              {MODULE_WARNINGS[selectedModule] && (
                <p className={`text-[11px] text-yellow-400 border border-yellow-500/30 bg-yellow-500/5 rounded-lg px-3 py-2 ${mono}`}>
                  &#9888; {MODULE_WARNINGS[selectedModule]}
                </p>
              )}
              {(MODULE_PARAM_FIELDS[selectedModule] ?? []).map((f) => (
                <div key={f.key}>
                  <label className={`block text-xs text-gray-500 mb-1 ${mono}`}>
                    {f.label}
                    {f.required && <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    placeholder={f.placeholder}
                    required={f.required}
                    value={moduleParams[f.key] ?? ""}
                    onChange={(e) => setModuleParams({ ...moduleParams, [f.key]: e.target.value })}
                    className={inputCls}
                  />
                </div>
              ))}
              {runError && <p className={`text-red-400 text-xs ${mono}`}>[ERROR] {runError}</p>}
              <button
                onClick={runModule}
                disabled={running}
                className={`bg-green-600/80 hover:bg-green-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-xs ${mono} transition-colors`}
              >
                {running ? "Starting..." : "$ run --module"}
              </button>

              {activeJob && (
                <div className="mt-4">
                  <p className={`text-[11px] text-gray-500 ${mono} mb-2`}>
                    status: {statusBadge(activeJob.status)} &middot; scope: {activeJob.scopeVerdict}
                  </p>
                  <pre className={`bg-black border border-gray-800 rounded-lg p-4 text-[11px] ${mono} text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto`}>
                    {activeJob.logText || "Waiting for output..."}
                  </pre>
                  {activeJob.resultJson?.findings && activeJob.resultJson.findings.length > 0 && (
                    <div className="mt-3 bg-[#0a0a0a] border border-red-500/30 rounded-lg p-4">
                      <p className={`text-xs text-red-400 ${mono} mb-2`}>
                        {activeJob.resultJson.findings.length} finding(s)
                      </p>
                      <pre className={`text-[10px] ${mono} text-gray-400 whitespace-pre-wrap`}>
                        {JSON.stringify(activeJob.resultJson.findings, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ Job history ═══ */}
          {jobs.length > 0 && (
            <div className="bg-[#111] border border-gray-800/50 rounded-xl p-6">
              <h3 className={`text-sm font-semibold text-white ${mono} mb-4`}>Job History</h3>
              <div className={`space-y-2 text-xs ${mono}`}>
                {jobs.map((j) => (
                  <div key={j.id} className="flex justify-between border-b border-gray-800/50 pb-2">
                    <span className="text-gray-400">
                      {MODULE_LABELS[j.moduleId] ?? j.moduleId} &middot; {j.target.slice(0, 50)}
                    </span>
                    <span>{statusBadge(j.status)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
