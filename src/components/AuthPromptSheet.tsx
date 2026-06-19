import { FormEvent, useState } from "react";
import { LogIn, Waves } from "lucide-react";
import type { AuthSheetMode } from "../types";

export const MIN_ACCOUNT_PASSWORD_LENGTH = 12;

type AuthPanelMode = "create" | "signin";

export function AuthPromptSheet({
  mode,
  authMessage,
  isAuthConfigured,
  onGoogleAuth,
  onCreateEmailAccount,
  onEmailSignIn,
  onPasswordReset,
  onContinueAsGuest,
  onClose,
}: {
  mode: AuthSheetMode;
  authMessage: string;
  isAuthConfigured: boolean;
  onGoogleAuth: () => Promise<boolean>;
  onCreateEmailAccount: (input: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<boolean>;
  onEmailSignIn: (input: { email: string; password: string }) => Promise<boolean>;
  onPasswordReset: (email: string) => Promise<boolean>;
  onContinueAsGuest: () => void;
  onClose: () => void;
}) {
  const isAccountRequired = mode === "save-required";
  const [authPanelMode, setAuthPanelMode] =
    useState<AuthPanelMode>(isAccountRequired ? "signin" : "create");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage("");

    if (!isAuthConfigured || isSubmitting) {
      return;
    }

    const safeEmail = email.trim();
    const safePassword = password;

    if (!safeEmail || !safePassword) {
      setFormMessage("Email and password are required.");
      return;
    }

    if (
      authPanelMode === "create" &&
      safePassword.length < MIN_ACCOUNT_PASSWORD_LENGTH
    ) {
      setFormMessage(
        `Use a password with at least ${MIN_ACCOUNT_PASSWORD_LENGTH} characters.`,
      );
      return;
    }

    setIsSubmitting(true);
    const ok =
      authPanelMode === "create"
        ? await onCreateEmailAccount({
            displayName: displayName.trim(),
            email: safeEmail,
            password: safePassword,
          })
        : await onEmailSignIn({ email: safeEmail, password: safePassword });
    setIsSubmitting(false);

    if (ok) {
      onClose();
    }
  }

  async function resetPassword() {
    setFormMessage("");

    if (!email.trim()) {
      setFormMessage("Enter your email address first.");
      return;
    }

    setIsSubmitting(true);
    const ok = await onPasswordReset(email.trim());
    setIsSubmitting(false);

    if (ok) {
      setFormMessage("Password reset email sent.");
    }
  }

  async function handleGoogleAuth() {
    setFormMessage("");
    setIsSubmitting(true);
    const ok = await onGoogleAuth();
    setIsSubmitting(false);

    if (ok) {
      onClose();
    }
  }

  return (
    <div className="auth-sheet-backdrop auth-sheet-backdrop--welcome" role="presentation">
      <section
        className="auth-sheet auth-sheet--welcome"
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to RiverLaunch.app"
      >
        <div className="auth-sheet__image">
          <img src="/images/river-tryweryn.jpeg" alt="" />
        </div>
        <div className="auth-sheet__content">
          <div className="auth-sheet__brand">
            <span className="brand-mark">
              <Waves size={22} strokeWidth={2.3} />
            </span>
            <span>
              <span className="brand-river">River</span>
              <span className="brand-launch">Launch</span>.app
            </span>
          </div>
          <div>
            <p className="eyebrow">Community river intelligence</p>
            <h2>Browse now. Save and contribute with an account.</h2>
            <p>
              Explore routes, levels, access points, hazards, and photos as a
              guest. Create an account when you want to save, upload, sync, or
              add local knowledge.
            </p>
          </div>
          {isAccountRequired ? (
            <p className="profile-message profile-message--neutral">
              That action needs an account. You can still continue browsing as a
              guest.
            </p>
          ) : null}
          {authMessage ? <p className="profile-message">{authMessage}</p> : null}
          {formMessage ? (
            <p className="profile-message profile-message--neutral">{formMessage}</p>
          ) : null}
          <div
            className="segmented-control auth-mode-tabs"
            role="group"
            aria-label="Account action"
          >
            <button
              className={authPanelMode === "create" ? "active" : ""}
              type="button"
              aria-pressed={authPanelMode === "create"}
              onClick={() => setAuthPanelMode("create")}
            >
              Create account
            </button>
            <button
              className={authPanelMode === "signin" ? "active" : ""}
              type="button"
              aria-pressed={authPanelMode === "signin"}
              onClick={() => setAuthPanelMode("signin")}
            >
              Sign in
            </button>
            <button
              className="auth-guest-button"
              type="button"
              onClick={onContinueAsGuest}
            >
              Continue as guest
            </button>
          </div>
          <form className="auth-form" onSubmit={submitEmailAuth}>
            {authPanelMode === "create" ? (
              <label>
                Display name
                <input
                  autoComplete="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your paddling name"
                />
              </label>
            ) : null}
            <label>
              Email
              <input
                autoComplete="email"
                inputMode="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                autoComplete={
                  authPanelMode === "create" ? "new-password" : "current-password"
                }
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  authPanelMode === "create"
                    ? "At least 12 characters"
                    : "Your password"
                }
                required
              />
              {authPanelMode === "create" ? (
                <span className="auth-password-tip">
                  Tip: three unrelated words are memorable and hard to guess.
                </span>
              ) : null}
            </label>
            <button
              className="primary-action primary-action--full"
              type="submit"
              disabled={!isAuthConfigured || isSubmitting}
            >
              <LogIn size={16} />
              {isSubmitting
                ? "Please wait..."
                : authPanelMode === "create"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>
          <button
            className="ghost-button auth-google-button"
            type="button"
            onClick={handleGoogleAuth}
            disabled={!isAuthConfigured || isSubmitting}
          >
            <LogIn size={16} />
            {authPanelMode === "create"
              ? "Create account with Google"
              : "Sign in with Google"}
          </button>
          {authPanelMode === "signin" ? (
            <div className="auth-sheet__actions">
              <button
                className="ghost-button"
                type="button"
                onClick={() => void resetPassword()}
                disabled={!isAuthConfigured || isSubmitting}
              >
                Reset password
              </button>
            </div>
          ) : null}
          {!isAuthConfigured ? (
            <p className="auth-sheet__note">
              Sign-in is not configured in this environment.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
