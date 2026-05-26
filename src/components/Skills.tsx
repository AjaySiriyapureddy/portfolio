"use client";

import { useEffect, useState } from "react";

interface Skill {
  id: string;
  name: string;
  category: string;
  proficiency: number;
}

const categoryColors: Record<string, { bar: string; text: string; bg: string }> = {
  Cybersecurity: { bar: "from-red-600 to-red-400", text: "text-red-400", bg: "bg-red-500" },
  "Security Tools": { bar: "from-red-700 to-orange-500", text: "text-orange-400", bg: "bg-orange-500" },
  Development: { bar: "from-green-600 to-green-400", text: "text-green-400", bg: "bg-green-500" },
  "Business & Ops": { bar: "from-emerald-600 to-teal-400", text: "text-teal-400", bg: "bg-teal-500" },
};

export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then(setSkills)
      .catch(() => {});
  }, []);

  const categories = [...new Set(skills.map((s) => s.category))];

  return (
    <section id="skills" className="py-24 px-4 bg-[#080808]/75">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="font-[family-name:var(--font-mono)] text-xs text-green-500/60 mb-3">
            {`// ===== SKILL_MATRIX =====`}
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Skills & <span className="text-green-400">Arsenal</span>
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm">
            Tools, technologies, and expertise across cybersecurity, development,
            and business operations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {categories.map((category) => {
            const colors = categoryColors[category] || {
              bar: "from-gray-600 to-gray-400",
              text: "text-gray-400",
              bg: "bg-gray-500",
            };
            return (
              <div
                key={category}
                className="bg-[#111] border border-gray-800/50 rounded-xl p-6"
              >
                <h3 className={`text-sm font-semibold mb-5 flex items-center gap-2 font-[family-name:var(--font-mono)] ${colors.text}`}>
                  <span className={`w-2 h-2 rounded-full ${colors.bg}`} />
                  {category.toUpperCase()}
                </h3>
                <div className="space-y-4">
                  {skills
                    .filter((s) => s.category === category)
                    .map((skill) => (
                      <div key={skill.id}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-gray-300 text-xs font-[family-name:var(--font-mono)]">
                            {skill.name}
                          </span>
                          <span className="text-gray-600 text-xs font-[family-name:var(--font-mono)]">
                            {skill.proficiency}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${colors.bar} rounded-full transition-all duration-1000`}
                            style={{ width: `${skill.proficiency}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
