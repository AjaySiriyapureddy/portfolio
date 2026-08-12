// Scope parsing and matching for the Bug Hunting tool.
//
// TypeScript port of the same logic already ported once to Python
// (from the CLI toolkit's ghost_scope.sh) — same noise-filtering rules for
// pasted bug-bounty program text, same pattern matching (wildcard subdomain,
// CIDR range, URL prefix, exact domain).
//
// Deliberate deviation from the original CLI tool: there is no "@all /
// unrestricted" escape hatch here — every engagement must declare an
// explicit, non-empty in-scope list, because every job is checked against it
// before anything is fetched.

const TLD_BLOCKLIST = new Set([
  "png", "jpg", "jpeg", "gif", "svg", "css", "js", "map", "txt", "md",
  "csv", "pdf", "zip", "gz", "tar", "bak", "log", "tmp", "xml", "json",
  "html", "htm",
]);

const NOISE_DOMAINS = new Set([
  "bugcrowd.com", "hackerone.com", "intigriti.com", "bugcrowdninja.com",
  "github.com", "google.com", "microsoft.com", "apple.com",
]);

const NOISE_URL_SUBSTRINGS = [
  "apps.apple.com", "play.google.com", "itunes.apple.com",
  "microsoft.com/store", "bugcrowd.com", "hackerone.com", "intigriti.com",
  "github.com", "docs.google.com",
];

const SECTION_HEADER_PREFIXES = [
  "in scope", "out of scope", "in-scope", "out-of-scope", "payment",
  "reward", "name / location", "name/location", "website testing",
  "api testing", "mobile application testing", "hardware testing",
  "network testing", "cloud testing", "ios", "android", "tags",
  "known issues", "credentials", "testing is only", "please note",
  "note:", "when reporting", "the following", "any domain",
  "this includes", "if you happen", "recorded future", "bugcrowd",
  "hackerone", "mobile application",
];

const WILDCARD_RE = /\*\.[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}/g;
const URL_RE = /https?:\/\/[a-zA-Z0-9._~:/?#@!$&*+,;=%-]+/g;
const IP_RE = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/\d{1,2})?\b/g;
const DOMAIN_RE = /\b[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}\b/g;
const VULN_EXCLUSION_RE = new RegExp(
  [
    "clickjacking", "csrf", "cross-site request", "mitm", "man.in.the.middle",
    "phishing", "social.engineering", "dos", "denial.of.service", "rate.limit",
    "brut.force", "ssl/tls", "missing.*best.practice", "cookie.*flag",
    "httponly", "secure.flag", "spf", "dkim", "dmarc", "content.spoofing",
    "text.injection", "version.disclosure", "banner", "stack.trace",
    "error.message", "tabnabbing", "open.redirect", "csv.injection",
    "zero.day", "broken.link", "outdated.*browser", "self-xss",
    "logout.csrf", "missing.*header", "idor", "insecure.direct",
    "injection.*without", "credential", "leaked", "spoofing", "public.*zero",
    "software.version", "user.interaction", "physical.access",
    "comma.separated", "vulnerable.librar",
  ].join("|"),
  "i"
);
const ONLY_DOMAIN_RE = /^(\*\.)?[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;

export function isValidDomain(domain: string): boolean {
  if (!domain.includes(".")) return false;
  const tld = domain.split(".").pop() ?? "";
  if (!/^[a-zA-Z]{2,20}$/.test(tld)) return false;
  if (TLD_BLOCKLIST.has(tld.toLowerCase())) return false;
  const prefix = domain.slice(0, domain.length - tld.length - 1);
  return prefix.length > 0;
}

function isNoiseLine(line: string): boolean {
  if (line.length > 300) return true;
  if (/^\d+$/.test(line)) return true;
  if (/^\$\d/.test(line)) return true;
  if (/^P\d/.test(line)) return true;
  const lowered = line.toLowerCase();
  return SECTION_HEADER_PREFIXES.some((prefix) => lowered.startsWith(prefix));
}

function dedupScopeEntries(entries: string[]): string[] {
  const result: string[] = [];
  for (const entry of entries) {
    if (!entry.startsWith("http")) {
      const hasUrl = entries.some(
        (u) => u.startsWith(`https://${entry}`) || u.startsWith(`http://${entry}`)
      );
      if (hasUrl) continue;
    }
    result.push(entry);
  }
  return result;
}

export function parseTargetsFromText(text: string): string[] {
  const found: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || isNoiseLine(line)) continue;

    const wildcardMatches = [...line.matchAll(WILDCARD_RE)];
    if (wildcardMatches.length > 0) {
      for (const m of wildcardMatches) found.push(m[0]);
      continue;
    }

    const urlMatches = [...line.matchAll(URL_RE)];
    if (urlMatches.length > 0) {
      for (const m of urlMatches) {
        const u = m[0].replace(/[)\]>,;]+$/, "").replace(/\.$/, "");
        if (!u) continue;
        if (NOISE_URL_SUBSTRINGS.some((noise) => u.includes(noise))) continue;
        found.push(u);
      }
      continue;
    }

    const ipMatches = [...line.matchAll(IP_RE)];
    if (ipMatches.length > 0) {
      for (const m of ipMatches) found.push(m[0]);
      continue;
    }

    for (const m of line.matchAll(DOMAIN_RE)) {
      const d = m[0];
      if (!isValidDomain(d)) continue;
      if (NOISE_DOMAINS.has(d.toLowerCase())) continue;
      found.push(d);
    }
  }

  const unique = Array.from(new Set(found)).sort();
  return dedupScopeEntries(unique);
}

export function parseOosFromText(text: string): string[] {
  const found: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const lowered = line.toLowerCase();
    if (
      [
        "out of scope", "out-of-scope", "when reporting", "the following",
        "please consider", "please note", "specific out-of-scope",
        "lists with", "known vulnerable", "previously known",
      ].some((p) => lowered.startsWith(p))
    ) {
      continue;
    }

    if (VULN_EXCLUSION_RE.test(line)) continue;

    if (/\b(issues|regarding|related|similar|for|affecting)\b.*\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\b/i.test(line)) {
      continue;
    }

    if (ONLY_DOMAIN_RE.test(line)) {
      const stripped = line.replace(/^\*\./, "");
      if (!isValidDomain(stripped)) continue;
      if (NOISE_DOMAINS.has(line.toLowerCase())) continue;
      found.push(line);
    }
  }
  return Array.from(new Set(found)).sort();
}

function extractDomain(target: string): string {
  const withoutScheme = target.replace(/^https?:\/\//, "");
  return withoutScheme.split("/")[0].split(":")[0];
}

function ipToLong(ip: string): number | null {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function matchesCidr(ip: string, cidr: string): boolean {
  const [network, prefixStr] = cidr.split("/");
  const prefix = parseInt(prefixStr, 10);
  const ipLong = ipToLong(ip);
  const netLong = ipToLong(network);
  if (ipLong === null || netLong === null || Number.isNaN(prefix)) return false;
  if (prefix === 0) return true;
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return (ipLong & mask) === (netLong & mask);
}

export function matchPattern(target: string, pattern: string): boolean {
  const domain = extractDomain(target);

  if (pattern === "*" || pattern === "@all") return true;

  if (pattern.startsWith("*.")) {
    const base = pattern.slice(2);
    return domain === base || domain.endsWith(`.${base}`);
  }

  if (pattern.includes("/") && /^\d+\.\d+\.\d+\.\d+\//.test(pattern)) {
    return matchesCidr(domain, pattern);
  }

  if (pattern.startsWith("http://") || pattern.startsWith("https://")) {
    const clean = pattern.replace(/\*$/, "");
    return target.startsWith(clean);
  }

  return domain === pattern;
}

export interface Scope {
  scopeIn: string[];
  scopeOut: string[];
}

export function isInScope(target: string, scope: Scope): boolean {
  for (const pattern of scope.scopeOut) {
    if (matchPattern(target, pattern)) return false;
  }
  for (const pattern of scope.scopeIn) {
    if (matchPattern(target, pattern)) return true;
  }
  return false;
}
