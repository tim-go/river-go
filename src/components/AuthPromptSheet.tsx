import { FormEvent, useState } from "react";
import { LogIn, Waves } from "lucide-react";
import { GoogleIcon } from "./auth/GoogleIcon";
import type { AuthSheetMode } from "../types";

export function AuthPromptSheet({
  mode,
  authMessage,
  isAuthConfigured,
  onGoogleAuth,
  onEmailSignIn,
  onPasswordReset,
  onContinueAsGuest,
  onClose,
}: {
  mode: AuthSheetMode;
  authMessage: string;
  isAuthConfigured: boolean;
  onGoogleAuth: () => Promise<boolean>;
  // Kept for API compatibility; account creation now lives on the /signup page.
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage("");

    if (!isAuthConfigured || isSubmitting) {
      return;
    }

    const safeEmail = email.trim();
    if (!safeEmail || !password) {
      setFormMessage("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    const ok = await onEmailSignIn({ email: safeEmail, password });
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
          <picture>
            <source srcSet="/images/river-tryweryn.webp" type="image/webp" />
            <img src="/images/river-tryweryn.jpeg" alt="" />
          </picture>
        </div>
        <div className="auth-sheet__content">
          <div className="auth-sheet__brand">
            <span className="brand-mark">
              <Waves size={22} strokeWidth={2.3} />
            </span>
            <span>
              River<span className="brand-launch">Launch</span>.app
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
              That action needs an account — you can keep browsing as a guest.
            </p>
          ) : null}
          {authMessage ? <p className="profile-message">{authMessage}</p> : null}
          {formMessage ? (
            <p className="profile-message profile-message--neutral">{formMessage}</p>
          ) : null}

          <form className="auth-form" onSubmit={submitSignIn}>
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
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                required
              />
            </label>
            <button
              className="primary-action primary-action--full"
              type="submit"
              disabled={!isAuthConfigured || isSubmitting}
            >
              <LogIn size={16} />
              {isSubmitting ? "Please wait..." : "Sign in"}
            </button>
          </form>

          <button
            className="ghost-button auth-google-button"
            type="button"
            onClick={handleGoogleAuth}
            disabled={!isAuthConfigured || isSubmitting}
          >
            <GoogleIcon size={18} />
            Sign in with Google
          </button>

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

          <p className="auth-sheet__signup-prompt">
            New to RiverLaunch.app? <a href="/signup">Create an account</a>
          </p>
          <button
            className="auth-guest-button"
            type="button"
            onClick={onContinueAsGuest}
          >
            Continue as guest
          </button>

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
