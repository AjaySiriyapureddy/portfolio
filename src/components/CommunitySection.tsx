export default function CommunitySection() {
  const roles = [
    {
      org: "SecurityBoat Community",
      role: "Hyderabad Chapter Lead",
      badge: "LEAD",
      badgeColor: "text-green-400 border-green-500/30 bg-green-500/10",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="16" cy="9" r="4" />
          <path d="M8 26c0-4.4 3.6-8 8-8s8 3.6 8 8" />
          <circle cx="7" cy="14" r="3" />
          <path d="M1 26c0-3.3 2.7-6 6-6" />
          <circle cx="25" cy="14" r="3" />
          <path d="M31 26c0-3.3-2.7-6-6-6" />
          <path d="M13 6.5 L10 10 M19 6.5 L22 10" strokeWidth="1.2" opacity="0.5" />
        </svg>
      ),
      description: "Leading the Hyderabad chapter — organizing meetups, workshops, and knowledge-sharing sessions for the local security community.",
    },
    {
      org: "Black Hat India",
      role: "Core Team",
      badge: "CORE TEAM",
      badgeColor: "text-red-400 border-red-500/30 bg-red-500/10",
      subOrg: "with Informa",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="8" width="24" height="18" rx="2" />
          <path d="M4 13h24" />
          <circle cx="10" cy="10.5" r="1.2" fill="currentColor" opacity="0.6" />
          <circle cx="14" cy="10.5" r="1.2" fill="currentColor" opacity="0.4" />
          <path d="M11 19h10M11 22h6" strokeWidth="1.5" opacity="0.6" />
          <path d="M16 5v3" />
          <path d="M11 5.5 L16 5 L21 5.5" strokeWidth="1.4" opacity="0.5" />
        </svg>
      ),
      description: "Core team member for Black Hat India in partnership with Informa — contributing to one of Asia's premier cybersecurity conferences.",
    },
  ];

  return (
    <section className="py-16 px-4 border-y border-gray-800/40 bg-[#0d0d0d]/60">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="font-[family-name:var(--font-mono)] text-xs text-green-500/60 mb-3">
            {`// ===== COMMUNITY & AFFILIATIONS =====`}
          </div>
          <h2 className="text-3xl font-bold text-white">
            Community <span className="text-red-500">Roles</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {roles.map((r) => (
            <div
              key={r.org}
              className="bg-[#111] border border-gray-800/50 rounded-xl p-6 hover:border-gray-700/60 transition-all duration-300 hover:shadow-lg hover:shadow-black/30 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`p-2.5 rounded-lg border ${r.badgeColor} border-opacity-30`}>
                  <span className={r.badgeColor.split(" ")[0]}>{r.icon}</span>
                </div>
                <span className={`text-[10px] font-[family-name:var(--font-mono)] px-2 py-0.5 rounded border ${r.badgeColor} self-start mt-1`}>
                  {r.badge}
                </span>
              </div>

              <div>
                <h3 className="text-white font-semibold text-base">{r.org}</h3>
                {r.subOrg && (
                  <span className="text-xs text-gray-600 font-[family-name:var(--font-mono)]">{r.subOrg}</span>
                )}
                <p className="text-green-400/80 font-[family-name:var(--font-mono)] text-sm mt-1">{r.role}</p>
              </div>

              <p className="text-gray-500 text-sm leading-relaxed">{r.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
