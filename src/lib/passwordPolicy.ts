// Password policy (ported from kinetiq-engine's auth-password-policy, minus i18n).
// Pure: the caller supplies the zxcvbn score (0-4) so the heavy zxcvbn dictionary
// can be lazy-loaded by the UI; see PasswordStrengthField.

export const PASSWORD_POLICY = {
  minLength: 12,
  minScore: 3,
  hint: "Use 12+ characters. A short phrase is fine — just avoid common or predictable passwords.",
} as const;

export type PasswordStrengthLabel = "empty" | "weak" | "okay" | "strong";

export type PasswordPolicyStatus = {
  lengthOk: boolean;
  noOuterWhitespace: boolean;
  score: number; // 0-4
  scoreOk: boolean;
  strengthLabel: PasswordStrengthLabel;
  valid: boolean;
  message: string | null;
};

export function strengthLabel(score: number): PasswordStrengthLabel {
  if (score <= 1) return "weak";
  if (score === 2) return "okay";
  return "strong";
}

// Given a password and its zxcvbn score, compute the policy status. Length and
// "not easily guessed" (score) must both pass; leading/trailing whitespace is
// rejected. No composition rules (NIST 800-63B) — zxcvbn judges guessability.
export function evaluatePassword(
  password: string,
  score: number,
): PasswordPolicyStatus {
  if (!password) {
    return {
      lengthOk: false,
      noOuterWhitespace: true,
      score: 0,
      scoreOk: false,
      strengthLabel: "empty",
      valid: false,
      message: "Password is required.",
    };
  }

  if (password !== password.trim()) {
    return {
      lengthOk: password.length >= PASSWORD_POLICY.minLength,
      noOuterWhitespace: false,
      score: 0,
      scoreOk: false,
      strengthLabel: "weak",
      valid: false,
      message: "Password cannot start or end with spaces.",
    };
  }

  const lengthOk = password.length >= PASSWORD_POLICY.minLength;
  const scoreOk = score >= PASSWORD_POLICY.minScore;
  const valid = lengthOk && scoreOk;

  let message: string | null = null;
  if (!lengthOk) {
    message = `Password must be at least ${PASSWORD_POLICY.minLength} characters.`;
  } else if (!scoreOk) {
    message = "Choose a less predictable password or add a few more words.";
  }

  return {
    lengthOk,
    noOuterWhitespace: true,
    score,
    scoreOk,
    strengthLabel: strengthLabel(score),
    valid,
    message,
  };
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
): string | null {
  if (!confirmPassword) return "Confirm your password.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return null;
}
