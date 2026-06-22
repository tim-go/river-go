import { useEffect, useState, type FormEvent } from "react";
import { LogIn, Waves } from "lucide-react";
import {
  createAccountWithEmail,
  signInWithGoogle,
  subscribeToAuthState,
} from "../services/firebaseAuth";
import { GoogleIcon } from "../components/auth/GoogleIcon";
import { PasswordStrengthField } from "../components/auth/PasswordStrengthField";
import {
  validatePasswordConfirmation,
  type PasswordPolicyStatus,
} from "../lib/passwordPolicy";
import "./signup.css";

export function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwStatus, setPwStatus] = useState<PasswordPolicyStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfigured, setUnconfigured] = useState(false);

  // Already signed in (incl. returning from a Google redirect) → into the app.
  useEffect(() => {
    return subscribeToAuthState((state) => {
      if (state.status === "unconfigured") {
        setUnconfigured(true);
      } else if (state.status === "ready" && state.user) {
        window.location.href = "/";
      }
    });
  }, []);

  const canSubmit =
    !submitting &&
    !unconfigured &&
    Boolean(email.trim()) &&
    Boolean(pwStatus?.valid) &&
    Boolean(confirm) &&
    password === confirm;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!pwStatus?.valid) {
      setError(pwStatus?.message ?? "Choose a stronger password.");
      return;
    }
    const confirmError = validatePasswordConfirmation(password, confirm);
    if (confirmError) {
      setError(confirmError);
      return;
    }
    setSubmitting(true);
    try {
      await createAccountWithEmail({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
      });
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      // Popup path resolves here; redirect path navigates away and returns above.
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign up with Google.");
      setSubmitting(false);
    }
  }

  return (
    <main className="signup">
      <div className="signup__card">
        <a className="signup__brand" href="/">
          <span className="signup__mark" aria-hidden="true">
            <Waves size={22} strokeWidth={2.3} />
          </span>
          <span>
            River<span className="signup__brand-accent">Launch</span>.app
          </span>
        </a>
        <h1>Create your account</h1>
        <p className="signup__sub">
          Save routes, sync across devices, and add local knowledge.
        </p>

        <form className="signup__form" onSubmit={handleSubmit}>
          <label className="signup__label">
            Display name
            <input
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your paddling name"
              disabled={submitting}
            />
          </label>
          <label className="signup__label">
            Email
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              disabled={submitting}
            />
          </label>
          <PasswordStrengthField
            label="Password"
            value={password}
            onChange={setPassword}
            onStatusChange={setPwStatus}
            disabled={submitting}
          />
          <label className="signup__label">
            Confirm password
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              disabled={submitting}
              required
            />
          </label>
          {error ? <p className="signup__error">{error}</p> : null}
          <button type="submit" className="signup__submit" disabled={!canSubmit}>
            <LogIn size={16} />
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="signup__divider" aria-hidden="true">
          <span>or</span>
        </div>
        <button
          type="button"
          className="signup__google"
          onClick={() => void handleGoogle()}
          disabled={submitting || unconfigured}
        >
          <GoogleIcon size={18} />
          Sign up with Google
        </button>

        {unconfigured ? (
          <p className="signup__note">Sign-up isn't configured in this environment.</p>
        ) : null}

        <p className="signup__alt">
          Already have an account? <a href="/">Sign in</a>
        </p>
        <a className="signup__guest" href="/">
          Continue as guest
        </a>
      </div>
    </main>
  );
}
