import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const ADMIN_FILE = path.join(process.cwd(), "data", "admin.json");
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET || "";
const MIN_PASSWORD_LENGTH = parseInt(process.env.PASSWORD_MIN_LENGTH || "12", 10);
const RESET_EXPIRY_MINUTES = parseInt(process.env.PASSWORD_RESET_EXPIRY_MINUTES || "15", 10);

interface AdminData {
  email: string;
  passwordHash: string;
  resetToken: string | null;
  resetTokenExpiry: string | null;
  resetTokenUsed: boolean;
  lastPasswordChange: string;
  failedAttempts: number;
  lockedUntil: string | null;
}

function getDefaultWiner(): AdminData {
  const email = process.env.WINER_EMAIL;
  const password = process.env.WINER_PASSWORD_HASH;

  if (!email) {
    throw new Error("FATAL: WINER_EMAIL env var is required");
  }

  // If WINER_PASSWORD_HASH looks like a bcrypt hash, use it directly
  // Otherwise, hash whatever is in WINER_PASSWORD for first-time setup
  let passwordHash: string;
  if (password && password.startsWith("$2")) {
    passwordHash = password;
  } else {
    // Fallback to WINER_PASSWORD for initial setup, then hash it
    const rawPassword = process.env.WINER_PASSWORD;
    if (!rawPassword) {
      throw new Error(
        "FATAL: Either WINER_PASSWORD_HASH (bcrypt hash) or WINER_PASSWORD must be set"
      );
    }
    passwordHash = bcrypt.hashSync(rawPassword, 12);
  }

  return {
    email,
    passwordHash,
    resetToken: null,
    resetTokenExpiry: null,
    resetTokenUsed: false,
    lastPasswordChange: new Date().toISOString(),
    failedAttempts: 0,
    lockedUntil: null,
  };
}

function readAdmin(): AdminData {
  try {
    if (fs.existsSync(ADMIN_FILE)) {
      const raw = fs.readFileSync(ADMIN_FILE, "utf-8");
      return JSON.parse(raw) as AdminData;
    }
  } catch {
    // File corrupted or missing — regenerate
  }
  // First run: create from env
  const admin = getDefaultWiner();
  writeAdmin(admin);
  return admin;
}

function writeAdmin(data: AdminData): void {
  // Ensure data directory exists (cloud/ephemeral FS support)
  const dir = path.dirname(ADMIN_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tempPath = ADMIN_FILE + ".tmp";
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tempPath, ADMIN_FILE);
}

/**
 * Validate password strength
 * Returns null if valid, or an error message string
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return "Password must contain at least one special character (!@#$%^&*...)";
  }
  // Check for common weak patterns
  const lower = password.toLowerCase();
  const weakPatterns = [
    "password", "123456", "qwerty", "admin", "letmein",
    "welcome", "monkey", "dragon", "master", "abc123",
  ];
  for (const pattern of weakPatterns) {
    if (lower.includes(pattern)) {
      return "Password contains a commonly used pattern. Choose something stronger.";
    }
  }
  return null;
}

/**
 * Verify winer credentials
 */
export function verifyWinerCredentials(
  email: string,
  password: string
): { success: boolean; error?: string } {
  const admin = readAdmin();

  // Check account lockout
  if (admin.lockedUntil) {
    const lockExpiry = new Date(admin.lockedUntil);
    if (lockExpiry > new Date()) {
      const remaining = Math.ceil(
        (lockExpiry.getTime() - Date.now()) / 1000
      );
      return {
        success: false,
        error: `Account locked. Try again in ${remaining} seconds.`,
      };
    }
    // Lock expired — reset
    admin.failedAttempts = 0;
    admin.lockedUntil = null;
    writeAdmin(admin);
  }

  // Constant-time email comparison
  const emailMatch = email === admin.email;
  // bcrypt.compareSync is already constant-time
  const passwordMatch = bcrypt.compareSync(password, admin.passwordHash);

  if (!emailMatch || !passwordMatch) {
    admin.failedAttempts++;

    // Lock after 5 failed attempts for 15 minutes
    if (admin.failedAttempts >= 5) {
      admin.lockedUntil = new Date(
        Date.now() + 15 * 60 * 1000
      ).toISOString();
      writeAdmin(admin);
      return {
        success: false,
        error: "Access suspended. Try again later.",
      };
    }

    writeAdmin(admin);
    return {
      success: false,
      error: "Authentication failed",
    };
  }

  // Success — reset attempts
  admin.failedAttempts = 0;
  admin.lockedUntil = null;
  writeAdmin(admin);

  return { success: true };
}

/**
 * Generate a password reset token
 */
export function generateResetToken(email: string): {
  success: boolean;
  token?: string;
  error?: string;
} {
  const admin = readAdmin();

  if (email !== admin.email) {
    // Don't reveal whether the email exists — always return success
    return { success: true };
  }

  // Generate cryptographically secure token
  const rawToken = crypto.randomBytes(32).toString("hex");
  // Hash the token before storing (so if DB is leaked, token is useless)
  const tokenHash = crypto
    .createHmac("sha256", RESET_TOKEN_SECRET)
    .update(rawToken)
    .digest("hex");

  admin.resetToken = tokenHash;
  admin.resetTokenExpiry = new Date(
    Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000
  ).toISOString();
  admin.resetTokenUsed = false;
  writeAdmin(admin);

  return { success: true, token: rawToken };
}

/**
 * Verify a reset token and change password
 */
export function resetPassword(
  token: string,
  newPassword: string
): { success: boolean; error?: string } {
  const admin = readAdmin();

  if (!admin.resetToken || !admin.resetTokenExpiry) {
    return { success: false, error: "No reset request found. Please request a new reset." };
  }

  if (admin.resetTokenUsed) {
    return {
      success: false,
      error: "This reset link has already been used. Request a new one.",
    };
  }

  // Check expiry
  if (new Date(admin.resetTokenExpiry) < new Date()) {
    admin.resetToken = null;
    admin.resetTokenExpiry = null;
    writeAdmin(admin);
    return {
      success: false,
      error: "Reset link has expired. Please request a new one.",
    };
  }

  // Verify token (hash the incoming token and compare)
  const tokenHash = crypto
    .createHmac("sha256", RESET_TOKEN_SECRET)
    .update(token)
    .digest("hex");

  if (tokenHash !== admin.resetToken) {
    return { success: false, error: "Invalid reset token." };
  }

  // Validate new password strength
  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) {
    return { success: false, error: strengthError };
  }

  // Check new password isn't the same as old
  if (bcrypt.compareSync(newPassword, admin.passwordHash)) {
    return {
      success: false,
      error: "New password must be different from the current password.",
    };
  }

  // All checks passed — update password
  admin.passwordHash = bcrypt.hashSync(newPassword, 12);
  admin.resetToken = null;
  admin.resetTokenExpiry = null;
  admin.resetTokenUsed = true;
  admin.lastPasswordChange = new Date().toISOString();
  admin.failedAttempts = 0;
  admin.lockedUntil = null;
  writeAdmin(admin);

  return { success: true };
}

/**
 * Get winer email (for sending reset emails)
 */
export function getWinerEmail(): string {
  const admin = readAdmin();
  return admin.email;
}
