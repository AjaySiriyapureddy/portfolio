/**
 * Input Validation Rules — shared between frontend display and backend enforcement
 *
 * WHAT WE ACCEPT:
 * - Name: 2-100 chars, letters/spaces/hyphens/apostrophes only
 * - Email: valid format, max 254 chars, no special URL chars
 * - Subject: 2-200 chars, alphanumeric + basic punctuation
 * - Message: 10-5000 chars, any printable text
 *
 * WHAT WE REJECT:
 * - HTML tags: <script>, <img>, <a>, etc.
 * - JavaScript URIs: javascript:, data:, vbscript:
 * - SQL injection patterns: ' OR 1=1, UNION SELECT, --, etc.
 * - Template injection: {{, ${, #{
 * - Null bytes: \x00
 * - Excessive whitespace or control characters
 * - Emoji-only or symbol-only names
 */

export interface ValidationRule {
  field: string;
  label: string;
  minLength: number;
  maxLength: number;
  required: boolean;
  pattern?: RegExp;
  patternMessage?: string;
  description: string;
  accepts: string;
  rejects: string;
}

export const CONTACT_RULES: ValidationRule[] = [
  {
    field: "name",
    label: "Name",
    minLength: 2,
    maxLength: 100,
    required: true,
    pattern: /^[a-zA-Z\s'\-.]+$/,
    patternMessage: "Only letters, spaces, hyphens, and apostrophes allowed",
    description: "Your full name",
    accepts: "Letters (a-z, A-Z), spaces, hyphens (-), apostrophes (')",
    rejects: "Numbers, special characters, HTML tags, emojis",
  },
  {
    field: "email",
    label: "Email",
    minLength: 5,
    maxLength: 254,
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternMessage: "Must be a valid email format (e.g., name@domain.com)",
    description: "Your email address for replies",
    accepts: "Valid email format: user@domain.com",
    rejects: "Spaces, multiple @ signs, missing domain",
  },
  {
    field: "subject",
    label: "Subject",
    minLength: 2,
    maxLength: 200,
    required: true,
    pattern: /^[a-zA-Z0-9\s.,!?'"\-:;()&/]+$/,
    patternMessage: "Only letters, numbers, and basic punctuation allowed",
    description: "Brief subject of your message",
    accepts: "Letters, numbers, spaces, basic punctuation (.,!?-:;)",
    rejects: "HTML tags, script content, special encoding",
  },
  {
    field: "message",
    label: "Message",
    minLength: 10,
    maxLength: 5000,
    required: true,
    description: "Your detailed message",
    accepts: "Any printable text, line breaks",
    rejects: "HTML/script tags, null bytes, control characters",
  },
];

// Dangerous patterns that are ALWAYS rejected in any field
const INJECTION_PATTERNS = [
  /<script[\s>]/i,
  /<\/script>/i,
  /<img[\s]/i,
  /<iframe[\s]/i,
  /<object[\s]/i,
  /<embed[\s]/i,
  /<svg[\s]/i,
  /on\w+\s*=/i, // onclick=, onerror=, etc.
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /data\s*:text\/html/i,
  /\x00/, // null bytes
  /\{\{.*\}\}/, // template injection {{}}
  /\$\{.*\}/, // template literal ${}
  /#\{.*\}/, // Ruby template #{}
  /UNION\s+(ALL\s+)?SELECT/i,
  /;\s*DROP\s+TABLE/i,
  /;\s*DELETE\s+FROM/i,
  /'\s*OR\s+'?\d/i, // ' OR 1=1
  /--\s*$/, // SQL comment
  /\/\*[\s\S]*?\*\//, // Block comments
];

export interface ValidationResult {
  valid: boolean;
  field: string;
  error?: string;
  injectionDetected?: boolean;
}

/**
 * Validate a single field value against its rules
 */
export function validateField(
  field: string,
  value: string,
  rules: ValidationRule[]
): ValidationResult {
  const rule = rules.find((r) => r.field === field);
  if (!rule) {
    return { valid: false, field, error: "Unknown field" };
  }

  const trimmed = value.trim();

  // Required check
  if (rule.required && trimmed.length === 0) {
    return {
      valid: false,
      field,
      error: `${rule.label} is required`,
    };
  }

  // Length checks
  if (trimmed.length > 0 && trimmed.length < rule.minLength) {
    return {
      valid: false,
      field,
      error: `${rule.label} must be at least ${rule.minLength} characters (currently ${trimmed.length})`,
    };
  }
  if (trimmed.length > rule.maxLength) {
    return {
      valid: false,
      field,
      error: `${rule.label} must not exceed ${rule.maxLength} characters (currently ${trimmed.length})`,
    };
  }

  // Injection detection (all fields)
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        field,
        error: `${rule.label} contains potentially dangerous content that is not allowed`,
        injectionDetected: true,
      };
    }
  }

  // Pattern check (field-specific)
  if (rule.pattern && trimmed.length > 0 && !rule.pattern.test(trimmed)) {
    return {
      valid: false,
      field,
      error: rule.patternMessage || `${rule.label} contains invalid characters`,
    };
  }

  return { valid: true, field };
}

/**
 * Validate all contact form fields
 */
export function validateContactForm(data: Record<string, string>): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const rule of CONTACT_RULES) {
    const value = data[rule.field] || "";
    results.push(validateField(rule.field, value, CONTACT_RULES));
  }

  return results;
}

/**
 * Get human-readable validation rules for display
 */
export function getContactFormRules(): Array<{
  field: string;
  label: string;
  description: string;
  accepts: string;
  rejects: string;
  limits: string;
}> {
  return CONTACT_RULES.map((rule) => ({
    field: rule.field,
    label: rule.label,
    description: rule.description,
    accepts: rule.accepts,
    rejects: rule.rejects,
    limits: `${rule.minLength}-${rule.maxLength} characters, ${rule.required ? "required" : "optional"}`,
  }));
}
