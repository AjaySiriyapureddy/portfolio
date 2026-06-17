"use client";

import { useState, FormEvent } from "react";

const FIELD_RULES = [
  {
    field: "name",
    accepts: "Letters (a-z, A-Z), spaces, hyphens, apostrophes",
    rejects: "Numbers, special chars, HTML tags, emojis, scripts",
    limits: "2-100 characters, required",
  },
  {
    field: "email",
    accepts: "Valid email: user@domain.com",
    rejects: "Spaces, multiple @, missing domain, scripts",
    limits: "5-254 characters, required",
  },
  {
    field: "subject",
    accepts: "Letters, numbers, basic punctuation (.,!?-:;)",
    rejects: "HTML tags, <script>, injection patterns, encoded chars",
    limits: "2-200 characters, required",
  },
  {
    field: "message",
    accepts: "Any printable text, line breaks",
    rejects: "HTML/script tags, null bytes, SQL injection, template injection ({{, ${)}",
    limits: "10-5000 characters, required",
  },
];

const NAME_REGEX = /^[a-zA-Z\s'\-.]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBJECT_REGEX = /^[a-zA-Z0-9\s.,!?'"\-:;()&/]+$/;
const INJECTION_PATTERNS = [
  /<script/i, /<\/script/i, /<img/i, /<iframe/i, /<svg/i,
  /on\w+\s*=/i, /javascript\s*:/i, /vbscript\s*:/i,
  /UNION\s+(ALL\s+)?SELECT/i, /;\s*DROP\s+TABLE/i,
  /'\s*OR\s+'?\d/i, /\{\{.*\}\}/, /\$\{.*\}/,
];

function detectInjection(value: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(value));
}

interface FieldError {
  field: string;
  message: string;
  type: "validation" | "injection";
}

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    consent: false,
  });
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [showRules, setShowRules] = useState(false);

  const validateLocally = (): FieldError[] => {
    const errs: FieldError[] = [];

    // Name
    if (!form.name.trim()) {
      errs.push({ field: "name", message: "Name is required", type: "validation" });
    } else if (form.name.trim().length < 2) {
      errs.push({ field: "name", message: `Name must be at least 2 characters (currently ${form.name.trim().length})`, type: "validation" });
    } else if (form.name.trim().length > 100) {
      errs.push({ field: "name", message: "Name must not exceed 100 characters", type: "validation" });
    } else if (!NAME_REGEX.test(form.name.trim())) {
      errs.push({ field: "name", message: "Only letters, spaces, hyphens, and apostrophes allowed", type: "validation" });
    } else if (detectInjection(form.name)) {
      errs.push({ field: "name", message: "Potentially dangerous content detected", type: "injection" });
    }

    // Email
    if (!form.email.trim()) {
      errs.push({ field: "email", message: "Email is required", type: "validation" });
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      errs.push({ field: "email", message: "Must be a valid email format (name@domain.com)", type: "validation" });
    } else if (form.email.trim().length > 254) {
      errs.push({ field: "email", message: "Email must not exceed 254 characters", type: "validation" });
    }

    // Subject
    if (!form.subject.trim()) {
      errs.push({ field: "subject", message: "Subject is required", type: "validation" });
    } else if (form.subject.trim().length < 2) {
      errs.push({ field: "subject", message: `Subject must be at least 2 characters`, type: "validation" });
    } else if (form.subject.trim().length > 200) {
      errs.push({ field: "subject", message: "Subject must not exceed 200 characters", type: "validation" });
    } else if (!SUBJECT_REGEX.test(form.subject.trim())) {
      errs.push({ field: "subject", message: "Only letters, numbers, and basic punctuation allowed", type: "validation" });
    } else if (detectInjection(form.subject)) {
      errs.push({ field: "subject", message: "Potentially dangerous content detected", type: "injection" });
    }

    // Message
    if (!form.message.trim()) {
      errs.push({ field: "message", message: "Message is required", type: "validation" });
    } else if (form.message.trim().length < 10) {
      errs.push({ field: "message", message: `Message must be at least 10 characters (currently ${form.message.trim().length})`, type: "validation" });
    } else if (form.message.trim().length > 5000) {
      errs.push({ field: "message", message: "Message must not exceed 5000 characters", type: "validation" });
    } else if (detectInjection(form.message)) {
      errs.push({ field: "message", message: "Potentially dangerous content detected (HTML tags, scripts, or injection patterns are not allowed)", type: "injection" });
    }

    // Consent
    if (!form.consent) {
      errs.push({ field: "consent", message: "You must consent to data processing", type: "validation" });
    }

    return errs;
  };

  const getFieldError = (field: string) => errors.find((e) => e.field === field);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError("");

    const localErrors = validateLocally();
    setErrors(localErrors);

    if (localErrors.length > 0) {
      setStatus("error");
      return;
    }

    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || "Failed to send message");
        setStatus("error");
        return;
      }

      setStatus("success");
      setForm({ name: "", email: "", subject: "", message: "", consent: false });
      setErrors([]);
    } catch {
      setServerError("Network error. Please try again.");
      setStatus("error");
    }
  };

  const inputClass = (field: string) =>
    `w-full bg-[#111] border rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none transition-colors font-[family-name:var(--font-mono)] ${
      getFieldError(field)
        ? getFieldError(field)?.type === "injection"
          ? "border-red-500 focus:border-red-400"
          : "border-yellow-500/50 focus:border-yellow-500"
        : "border-gray-800 focus:border-red-500/50"
    }`;

  return (
    <section id="contact" className="py-24 px-4 bg-[#080808]/75">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <div className="font-[family-name:var(--font-mono)] text-xs text-green-500/60 mb-3">
            {`// ===== CONTACT =====`}
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Get In <span className="text-green-400">Touch</span>
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm">
            Have a security assessment need or project proposal? All inputs are
            sanitized and validated.
          </p>
        </div>

        {/* Validation Rules Toggle */}
        <div className="mb-8">
          <button
            onClick={() => setShowRules(!showRules)}
            className="text-xs font-[family-name:var(--font-mono)] text-green-400/60 hover:text-green-400 transition-colors"
          >
            {showRules ? "[-]" : "[+]"} Input Validation Rules
          </button>
          {showRules && (
            <div className="mt-3 bg-[#111] border border-gray-800/50 rounded-xl p-5 overflow-x-auto">
              <table className="w-full text-xs font-[family-name:var(--font-mono)]">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-800/50">
                    <th className="pb-2 pr-4">Field</th>
                    <th className="pb-2 pr-4 text-green-400/60">Accepts</th>
                    <th className="pb-2 pr-4 text-red-400/60">Rejects</th>
                    <th className="pb-2">Limits</th>
                  </tr>
                </thead>
                <tbody className="text-gray-400">
                  {FIELD_RULES.map((rule) => (
                    <tr key={rule.field} className="border-b border-gray-800/30">
                      <td className="py-2 pr-4 text-white capitalize">{rule.field}</td>
                      <td className="py-2 pr-4 text-green-400/70">{rule.accepts}</td>
                      <td className="py-2 pr-4 text-red-400/70">{rule.rejects}</td>
                      <td className="py-2 text-gray-500">{rule.limits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-2 space-y-6">
            {[
              { icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", label: "Email", value: "Use the form below" },
              { icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z", label: "Location", value: "India" },
              { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "Security", value: "All inputs sanitized & validated" },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-[family-name:var(--font-mono)]">{label}</p>
                  <p className="text-white text-sm">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="md:col-span-3 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass("name")}
                />
                {getFieldError("name") && (
                  <p className={`text-[10px] mt-1 font-[family-name:var(--font-mono)] ${getFieldError("name")?.type === "injection" ? "text-red-400" : "text-yellow-400/80"}`}>
                    {getFieldError("name")?.type === "injection" ? "&#9888; " : ""}
                    {getFieldError("name")?.message}
                  </p>
                )}
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Your Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass("email")}
                />
                {getFieldError("email") && (
                  <p className="text-yellow-400/80 text-[10px] mt-1 font-[family-name:var(--font-mono)]">
                    {getFieldError("email")?.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="Subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className={inputClass("subject")}
              />
              {getFieldError("subject") && (
                <p className={`text-[10px] mt-1 font-[family-name:var(--font-mono)] ${getFieldError("subject")?.type === "injection" ? "text-red-400" : "text-yellow-400/80"}`}>
                  {getFieldError("subject")?.message}
                </p>
              )}
            </div>

            <div>
              <textarea
                placeholder="Your Message"
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className={`${inputClass("message")} resize-none`}
              />
              <div className="flex justify-between mt-1">
                {getFieldError("message") ? (
                  <p className={`text-[10px] font-[family-name:var(--font-mono)] ${getFieldError("message")?.type === "injection" ? "text-red-400" : "text-yellow-400/80"}`}>
                    {getFieldError("message")?.message}
                  </p>
                ) : (
                  <span />
                )}
                <span className={`text-[10px] font-[family-name:var(--font-mono)] ${form.message.length > 5000 ? "text-red-400" : "text-gray-600"}`}>
                  {form.message.length}/5000
                </span>
              </div>
            </div>

            {/* DPDPA Consent */}
            <div className="bg-[#0d0d0d] border border-gray-800/50 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                  className="mt-1 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500/50"
                />
                <span className="text-xs text-gray-500 leading-relaxed">
                  I consent to the processing of my personal data (name, email) for the
                  purpose of responding to my inquiry. Data retained for max 90 days.
                  I can request deletion anytime via the{" "}
                  <a href="/privacy" className="text-red-400/60 hover:text-red-400 underline">
                    data erasure portal
                  </a>
                  . (DPDPA compliant)
                </span>
              </label>
              {getFieldError("consent") && (
                <p className="text-yellow-400/80 text-[10px] mt-2 font-[family-name:var(--font-mono)]">
                  {getFieldError("consent")?.message}
                </p>
              )}
            </div>

            {serverError && (
              <p className="text-red-400 text-sm font-[family-name:var(--font-mono)]">
                <span className="text-gray-600">[SERVER_ERROR]</span> {serverError}
              </p>
            )}
            {status === "success" && (
              <p className="text-green-400 text-sm font-[family-name:var(--font-mono)]">
                <span className="text-gray-600">[SUCCESS]</span> Message sent and email
                notification delivered. I&apos;ll get back to you soon.
              </p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full bg-red-600/90 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-red-500/20 text-sm font-[family-name:var(--font-mono)]"
            >
              {status === "sending" ? "Transmitting..." : "$ send_message --secure --validated"}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-600 font-[family-name:var(--font-mono)]">
            DPDPA Notice: Data collected solely for communication. You have the right to access, correct, or delete
            your data via our{" "}
            <a href="/privacy" className="text-red-400/60 hover:text-red-400 underline">data erasure portal</a>.
          </p>
        </div>
      </div>
    </section>
  );
}
