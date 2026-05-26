export default function Footer() {
  return (
    <footer className="border-t border-gray-800/50 py-8 px-4 bg-[#0a0a0a]/75">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="font-[family-name:var(--font-mono)] text-xs text-gray-600">
            <span className="text-red-500/60">&copy;</span>{" "}
            {new Date().getFullYear()} Ajaya Siriyapureddy. All rights reserved.
          </div>
          <div className="flex gap-6">
            {["GitHub", "LinkedIn", "X"].map((name) => (
              <a
                key={name}
                href="#"
                className="text-gray-600 hover:text-green-400 text-xs font-[family-name:var(--font-mono)] transition-colors"
              >
                {name}
              </a>
            ))}
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 text-center">
          <div className="inline-block bg-[#111] border border-gray-800/50 rounded-lg px-4 py-2">
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-gray-600">
              <span className="text-green-500">&#9679;</span> Secured with OWASP Top 10
              compliance | DPDPA compliant |{" "}
              <span className="text-red-400">HSTS</span> enabled
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
