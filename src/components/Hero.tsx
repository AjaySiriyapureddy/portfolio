"use client";

import { useEffect, useState } from "react";

interface Profile {
  name: string;
  title: string;
  bio: string;
  social: { github: string; linkedin: string; twitter: string };
}

export default function Hero() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [typedText, setTypedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => {});
  }, []);

  const fullText = profile?.title || "Security Analyst & Developer";

  useEffect(() => {
    if (!fullText) return;
    let i = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [fullText]);

  useEffect(() => {
    const interval = setInterval(() => setShowCursor((p) => !p), 500);
    return () => clearInterval(interval);
  }, []);

  const name = profile?.name || "Ajaya Siriyapureddy";

  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Dark background with subtle matrix effect */}
      <div className="absolute inset-0 bg-[#0a0a0a]/70" />
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-green-500/10 to-transparent" />
        <div className="absolute top-0 left-2/4 w-px h-full bg-gradient-to-b from-transparent via-red-500/10 to-transparent" />
        <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-green-500/5 to-transparent" />
        <div className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-900/20 to-transparent" />
        <div className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-green-900/10 to-transparent" />
      </div>

      {/* Glow effects */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-green-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Community role badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-[family-name:var(--font-mono)] px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-400">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            SecurityBoat · Hyderabad Chapter Lead
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-[family-name:var(--font-mono)] px-3 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-400">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            Black Hat India · Core Team
          </span>
        </div>

        {/* Terminal-style header */}
        <div className="inline-block mb-8 bg-[#111] border border-green-900/30 rounded-lg px-6 py-3">
          <span className="font-[family-name:var(--font-mono)] text-xs">
            <span className="text-gray-600">[</span>
            <span className="text-green-400">SYSTEM</span>
            <span className="text-gray-600">]</span>
            <span className="text-gray-500 ml-2">
              Status: <span className="text-green-400">Active</span> | Threat Level:{" "}
              <span className="text-red-400">Elevated</span>
            </span>
          </span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold mb-4 leading-tight">
          <span className="text-gray-200">{name.split(" ")[0]} </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-green-400 glitch-text">
            {name.split(" ").slice(1).join(" ")}
          </span>
        </h1>

        <div className="font-[family-name:var(--font-mono)] text-lg sm:text-xl text-green-400/80 mb-6 h-8">
          <span className="text-red-500">$ </span>
          {typedText}
          <span className={`${showCursor ? "opacity-100" : "opacity-0"} text-green-400`}>
            |
          </span>
        </div>

        <p className="text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed text-sm">
          {profile?.bio || ""}
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="#projects"
            className="bg-red-600/90 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-red-500/20 text-sm font-[family-name:var(--font-mono)]"
          >
            ./view_projects
          </a>
          <a
            href="#vapt"
            className="border border-green-500/30 hover:border-green-500/60 text-green-400 hover:text-green-300 px-8 py-3 rounded-lg font-medium transition-all text-sm font-[family-name:var(--font-mono)]"
          >
            ./security_research
          </a>
          <a
            href="#contact"
            className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white px-8 py-3 rounded-lg font-medium transition-all text-sm font-[family-name:var(--font-mono)]"
          >
            ./contact_me
          </a>
        </div>

        <div className="flex justify-center gap-6 mt-10">
          {profile?.social && (
            <>
              {[
                { url: profile.social.github, label: "GitHub", icon: "M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" },
                { url: profile.social.linkedin, label: "LinkedIn", icon: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
                { url: profile.social.twitter, label: "X", icon: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
              ].map(({ url, label, icon }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-green-400 transition-colors"
                  aria-label={label}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={icon} />
                  </svg>
                </a>
              ))}
            </>
          )}
          <a
            href="https://wa.me/7993565252"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-green-400 transition-colors"
            aria-label="WhatsApp"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
