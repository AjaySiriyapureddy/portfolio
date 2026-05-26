"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

export default function PrivacyPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [result, setResult] = useState("");

  const handleErasure = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult(data.error);
        setStatus("error");
        return;
      }

      setResult(data.message);
      setStatus("done");
      setEmail("");
    } catch {
      setResult("Network error. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-24 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="text-green-400/60 hover:text-green-400 text-xs font-[family-name:var(--font-mono)] transition-colors mb-8 inline-block"
        >
          &larr; Back to Portfolio
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Privacy & Data Rights</h1>
        <p className="text-gray-500 text-sm mb-8">
          In compliance with the Digital Personal Data Protection Act (DPDPA)
        </p>

        <div className="space-y-8">
          <div className="bg-[#111] border border-gray-800/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Data We Collect</h2>
            <ul className="text-gray-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">&#9679;</span>
                <span>
                  <strong className="text-gray-300">Contact form:</strong> Name, email
                  address, subject, and message content
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">&#9679;</span>
                <span>
                  <strong className="text-gray-300">Purpose:</strong> Solely for
                  responding to your inquiry
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">&#9679;</span>
                <span>
                  <strong className="text-gray-300">Retention:</strong> Data is
                  automatically purged after 90 days
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">&#9679;</span>
                <span>
                  <strong className="text-gray-300">Sharing:</strong> We do not share
                  your data with any third parties
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-[#111] border border-gray-800/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Your Rights</h2>
            <ul className="text-gray-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">&#10003;</span>
                <span>Right to access your personal data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">&#10003;</span>
                <span>Right to correction of inaccurate data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">&#10003;</span>
                <span>Right to erasure (deletion) of your data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">&#10003;</span>
                <span>Right to withdraw consent at any time</span>
              </li>
            </ul>
          </div>

          <div className="bg-[#111] border border-red-900/30 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">
              Request Data Erasure
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              Enter the email address you used in the contact form. All messages
              associated with that email will be permanently deleted.
            </p>
            <form onSubmit={handleErasure} className="flex gap-3">
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50 font-[family-name:var(--font-mono)]"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="bg-red-600/90 hover:bg-red-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-[family-name:var(--font-mono)] transition-colors"
              >
                {status === "sending" ? "Processing..." : "Delete My Data"}
              </button>
            </form>
            {status === "done" && (
              <p className="text-green-400 text-xs mt-3 font-[family-name:var(--font-mono)]">
                {result}
              </p>
            )}
            {status === "error" && (
              <p className="text-red-400 text-xs mt-3 font-[family-name:var(--font-mono)]">
                {result}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
