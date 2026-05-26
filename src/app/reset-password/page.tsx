"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [strength, setStrength] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
  }, []);

  const checkStrength = (password: string) => {
    const issues: string[] = [];
    if (password.length < 12) issues.push("At least 12 characters");
    if (!/[A-Z]/.test(password)) issues.push("One uppercase letter");
    if (!/[a-z]/.test(password)) issues.push("One lowercase letter");
    if (!/[0-9]/.test(password)) issues.push("One number");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password))
      issues.push("One special character");
    setStrength(issues);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: form.newPassword,
          confirmPassword: form.confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error);
        setStatus("error");
        return;
      }

      setMessage(data.message);
      setStatus("success");
    } catch {
      setMessage("Network error. Please try again.");
      setStatus("error");
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Invalid Reset Link</h1>
          <p className="text-gray-500 text-sm mb-6">
            This password reset link is missing or invalid. Please request a new one.
          </p>
          <Link
            href="/x9k3"
            className="text-red-400 hover:text-red-300 text-sm font-[family-name:var(--font-mono)] transition-colors"
          >
            &larr; Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="font-[family-name:var(--font-mono)] text-xs text-green-500/60 mb-4">
            <span className="text-red-500">$</span> passwd --reset --secure
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-gray-600 text-xs mt-2 font-[family-name:var(--font-mono)]">
            Choose a strong new password
          </p>
        </div>

        {status === "success" ? (
          <div className="bg-[#111] border border-green-500/30 rounded-xl p-6 text-center">
            <p className="text-green-400 text-sm font-[family-name:var(--font-mono)] mb-4">
              {message}
            </p>
            <Link
              href="/x9k3"
              className="text-red-400 hover:text-red-300 text-sm font-[family-name:var(--font-mono)] transition-colors"
            >
              $ cd /login &rarr;
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-[#111] border border-gray-800/50 rounded-xl p-6 space-y-4"
          >
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-[family-name:var(--font-mono)]">
                New Password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(e) => {
                  setForm({ ...form, newPassword: e.target.value });
                  checkStrength(e.target.value);
                }}
                className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/50 font-[family-name:var(--font-mono)]"
              />
              {/* Password strength indicator */}
              {form.newPassword && (
                <div className="mt-2 space-y-1">
                  {strength.length === 0 ? (
                    <p className="text-green-400 text-[10px] font-[family-name:var(--font-mono)]">
                      &#10003; Password meets all requirements
                    </p>
                  ) : (
                    strength.map((issue) => (
                      <p
                        key={issue}
                        className="text-red-400/80 text-[10px] font-[family-name:var(--font-mono)]"
                      >
                        &#10007; {issue}
                      </p>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-[family-name:var(--font-mono)]">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/50 font-[family-name:var(--font-mono)]"
              />
              {form.confirmPassword &&
                form.newPassword !== form.confirmPassword && (
                  <p className="text-red-400/80 text-[10px] mt-1 font-[family-name:var(--font-mono)]">
                    &#10007; Passwords do not match
                  </p>
                )}
            </div>

            {/* Password requirements box */}
            <div className="bg-[#0a0a0a] border border-gray-800/50 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 font-[family-name:var(--font-mono)] mb-2">
                Password Requirements:
              </p>
              <ul className="text-[10px] text-gray-600 font-[family-name:var(--font-mono)] space-y-0.5">
                <li>&#8226; Minimum 12 characters</li>
                <li>&#8226; At least 1 uppercase letter (A-Z)</li>
                <li>&#8226; At least 1 lowercase letter (a-z)</li>
                <li>&#8226; At least 1 number (0-9)</li>
                <li>&#8226; At least 1 special character (!@#$%...)</li>
                <li>&#8226; No common patterns (password, qwerty, etc.)</li>
                <li>&#8226; Must differ from current password</li>
              </ul>
            </div>

            {status === "error" && (
              <p className="text-red-400 text-xs font-[family-name:var(--font-mono)]">
                <span className="text-gray-600">[ERROR]</span> {message}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "sending" || strength.length > 0}
              className="w-full bg-red-600/90 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors text-sm font-[family-name:var(--font-mono)]"
            >
              {status === "sending" ? "Resetting..." : "$ reset_password --confirm"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
