"use client";

export default function VAPTSection() {
  const services = [
    {
      title: "Web Application Testing",
      desc: "OWASP Top 10 assessment, API security testing, business logic flaws, authentication bypass, and session management analysis.",
      tags: ["OWASP", "API Security", "Auth Bypass"],
      icon: (
        <svg className="w-8 h-8 text-green-400" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="8" width="40" height="32" rx="3" />
          <line x1="6" y1="16" x2="46" y2="16" />
          <circle cx="11" cy="12" r="1.5" fill="currentColor" />
          <circle cx="16" cy="12" r="1.5" fill="currentColor" />
          <polyline points="16,26 10,30 16,34" />
          <polyline points="30,26 36,30 30,34" />
          <line x1="21" y1="36" x2="25" y2="24" />
          <circle cx="50" cy="44" r="10" />
          <path d="M50 38v6h4" />
          <rect x="46" y="40" width="8" height="8" rx="1" fill="none" />
        </svg>
      ),
    },
    {
      title: "Network Penetration Testing",
      desc: "External and internal network assessments, firewall configuration review, service enumeration, and exploitation of misconfigurations.",
      tags: ["Nmap", "Wireshark", "Network Recon"],
      icon: (
        <svg className="w-8 h-8 text-green-400" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="16" y="16" width="20" height="20" rx="4" strokeWidth="2.5" />
          <rect x="22" y="22" width="8" height="8" rx="2" strokeWidth="2" />
          <rect x="24" y="24" width="4" height="4" rx="1" fill="currentColor" />
          <line x1="26" y1="16" x2="26" y2="8" /><circle cx="26" cy="6" r="2" fill="currentColor" opacity="0.7" />
          <line x1="26" y1="36" x2="26" y2="44" /><circle cx="26" cy="46" r="2" fill="currentColor" opacity="0.7" />
          <line x1="16" y1="26" x2="8" y2="26" /><circle cx="6" cy="26" r="2" fill="currentColor" opacity="0.7" />
          <line x1="36" y1="26" x2="44" y2="26" /><circle cx="46" cy="26" r="2" fill="currentColor" opacity="0.7" />
          <line x1="19" y1="19" x2="13" y2="13" /><circle cx="11" cy="11" r="2" fill="currentColor" opacity="0.5" />
          <line x1="33" y1="19" x2="39" y2="13" /><circle cx="41" cy="11" r="2" fill="currentColor" opacity="0.5" />
          <line x1="19" y1="33" x2="13" y2="39" /><circle cx="11" cy="41" r="2" fill="currentColor" opacity="0.5" />
          <line x1="33" y1="33" x2="39" y2="39" /><circle cx="41" cy="41" r="2" fill="currentColor" opacity="0.5" />
          <line x1="34" y1="12" x2="40" y2="8" /><rect x="40" y="5" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.4" />
          <line x1="40" y1="34" x2="46" y2="40" /><rect x="46" y="38" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.4" />
        </svg>
      ),
    },
    {
      title: "Red Team Operations",
      desc: "Adversary simulation, social engineering, phishing campaigns, lateral movement, and persistence techniques to test organizational defenses.",
      tags: ["Adversary Sim", "Social Eng", "C2"],
      icon: (
        <svg className="w-8 h-8 text-green-400" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="32" r="22" strokeDasharray="4 3" opacity="0.3" />
          <circle cx="32" cy="32" r="15" strokeDasharray="4 3" opacity="0.5" />
          <circle cx="32" cy="32" r="8" />
          <circle cx="32" cy="32" r="3" fill="currentColor" />
          <line x1="32" y1="6" x2="32" y2="14" strokeWidth="2" />
          <line x1="32" y1="50" x2="32" y2="58" strokeWidth="2" />
          <line x1="6" y1="32" x2="14" y2="32" strokeWidth="2" />
          <line x1="50" y1="32" x2="58" y2="32" strokeWidth="2" />
        </svg>
      ),
    },
    {
      title: "Source Code Review",
      desc: "Static analysis, secure coding review, dependency auditing, and identification of hardcoded secrets, injection flaws, and logic vulnerabilities.",
      tags: ["SAST", "Code Review", "Dependency Audit"],
      icon: (
        <svg className="w-8 h-8 text-green-400" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="6" width="36" height="44" rx="3" />
          <line x1="16" y1="16" x2="36" y2="16" opacity="0.6" />
          <line x1="16" y1="22" x2="32" y2="22" opacity="0.6" />
          <line x1="16" y1="28" x2="28" y2="28" opacity="0.6" />
          <line x1="16" y1="34" x2="34" y2="34" opacity="0.6" />
          <line x1="16" y1="40" x2="24" y2="40" opacity="0.6" />
          <circle cx="44" cy="44" r="12" strokeWidth="2.5" />
          <line x1="52" y1="52" x2="60" y2="60" strokeWidth="3" />
          <polyline points="38,44 42,48 50,40" strokeWidth="2" />
        </svg>
      ),
    },
    {
      title: "Cloud Security Assessment",
      desc: "Cloud infrastructure review, IAM policy analysis, storage bucket security, and compliance checks for AWS/Azure/GCP environments.",
      tags: ["AWS", "Azure", "IAM", "Config Audit"],
      icon: (
        <svg className="w-8 h-8 text-green-400" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 40a12 12 0 01-.5-24 16 16 0 0131 0A10 10 0 0148 40H16z" />
          <rect x="24" y="28" width="12" height="10" rx="2" strokeWidth="2" />
          <circle cx="30" cy="33" r="2" fill="currentColor" />
          <line x1="30" y1="35" x2="30" y2="36" strokeWidth="2" />
          <line x1="20" y1="46" x2="20" y2="54" strokeWidth="2" opacity="0.5" />
          <line x1="30" y1="44" x2="30" y2="56" strokeWidth="2" opacity="0.5" />
          <line x1="40" y1="46" x2="40" y2="52" strokeWidth="2" opacity="0.5" />
          <circle cx="20" cy="56" r="2" fill="currentColor" opacity="0.5" />
          <circle cx="30" cy="58" r="2" fill="currentColor" opacity="0.5" />
          <circle cx="40" cy="54" r="2" fill="currentColor" opacity="0.5" />
        </svg>
      ),
    },
    {
      title: "Compliance & Reporting",
      desc: "DPDPA compliance audits, SANS guideline assessments, detailed vulnerability reports with CVSS scoring and remediation guidance.",
      tags: ["DPDPA", "SANS", "CVSS", "Compliance"],
      icon: (
        <svg className="w-8 h-8 text-green-400" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="10" width="30" height="38" rx="3" />
          <rect x="14" y="8" width="14" height="6" rx="2" />
          <line x1="14" y1="22" x2="28" y2="22" opacity="0.5" />
          <line x1="14" y1="28" x2="28" y2="28" opacity="0.5" />
          <line x1="14" y1="34" x2="24" y2="34" opacity="0.5" />
          <polyline points="14,39 17,42 23,36" strokeWidth="2" />
          <circle cx="46" cy="42" r="12" />
          <polyline points="42,42 45,45 52,38" strokeWidth="2.5" />
          <path d="M46 30V18l-6 4M46 18l6 4" strokeWidth="2" opacity="0.5" />
        </svg>
      ),
    },
  ];

  return (
    <section id="vapt" className="py-24 px-4 bg-[#0a0a0a]/75">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="font-[family-name:var(--font-mono)] text-xs text-red-500/60 mb-3">
            {`// ===== SECURITY_SERVICES =====`}
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            VAPT & <span className="text-red-500">Red Teaming</span>
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm">
            Comprehensive vulnerability assessment and penetration testing services
            to strengthen your security posture.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <div
              key={service.title}
              className="bg-[#111] border border-gray-800/50 rounded-xl p-6 hover:border-red-900/40 transition-all group"
            >
              <div className="mb-4">{service.icon}</div>
              <h3 className="text-base font-semibold text-white mb-2 group-hover:text-red-400 transition-colors">
                {service.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                {service.desc}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {service.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded font-[family-name:var(--font-mono)] bg-red-500/10 text-red-400/80 border border-red-500/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
