import { useEffect, useRef, useState, type FormEvent } from "react";
import { LogIn, Waves } from "lucide-react";
import {
  createAccountWithEmail,
  signInWithGoogle,
  subscribeToAuthState,
} from "../services/firebaseAuth";
import { updateMyProfile } from "../services/memberApi";
import { GoogleIcon } from "../components/auth/GoogleIcon";
import { PasswordStrengthField } from "../components/auth/PasswordStrengthField";
import {
  validatePasswordConfirmation,
  type PasswordPolicyStatus,
} from "../lib/passwordPolicy";
import "./signup.css";

function landOnDashboardApp() {
  // Tell the app to open the Dashboard once the redirect completes.
  sessionStorage.setItem("postAuthLanding", "dashboard");
  window.location.href = "/";
}

export function SignupPage() {
  const [name, setName] = useState("");
  const [publicName, setPublicName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwStatus, setPwStatus] = useState<PasswordPolicyStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfigured, setUnconfigured] = useState(false);
  // While the email sign-up is mid-flight, suppress the auth-state auto-redirect
  // below — otherwise signing in (during account creation) navigates away and
  // aborts the profile write. handleSubmit redirects itself once done.
  const handlingEmailSignup = useRef(false);

  // Already signed in (incl. returning from a Google redirect) → into the app.
  useEffect(() => {
    return subscribeToAuthState((state) => {
      if (state.status === "unconfigured") {
        setUnconfigured(true);
      } else if (
        state.status === "ready" &&
        state.user &&
        !handlingEmailSignup.current
      ) {
        landOnDashboardApp();
      }
    });
  }, []);

  const canSubmit =
    !submitting &&
    !unconfigured &&
    Boolean(name.trim()) &&
    Boolean(publicName.trim()) &&
    Boolean(email.trim()) &&
    Boolean(pwStatus?.valid) &&
    Boolean(confirm) &&
    password === confirm;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Add your name.");
      return;
    }
    if (!publicName.trim()) {
      setError("Add a public name so other paddlers can recognise you.");
      return;
    }
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
    // Hold off the auth-state auto-redirect until the profile write finishes.
    handlingEmailSignup.current = true;
    try {
      // Your name → the Firebase displayName (used in emails / account).
      await createAccountWithEmail({
        email: email.trim(),
        password,
        displayName: name.trim(),
      });
      // Public name → the member's public_name (the publicly visible name).
      // Now that the redirect is held, this completes before we navigate.
      try {
        await updateMyProfile({ publicName: publicName.trim() });
      } catch {
        // Non-fatal: the account exists; the name can be set later in Profile.
      }
      landOnDashboardApp();
    } catch (err) {
      handlingEmailSignup.current = false;
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
      landOnDashboardApp();
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
            Your name
            <input
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Alex Jones"
              required
              disabled={submitting}
            />
            <span className="signup__hint">
              For your account and emails — not shown publicly.
            </span>
          </label>
          <label className="signup__label">
            Public name
            <input
              autoComplete="nickname"
              value={publicName}
              onChange={(event) => setPublicName(event.target.value)}
              placeholder="Your name or paddling name"
              required
              disabled={submitting}
            />
            <span className="signup__hint">
              Shown to other paddlers on your contributions and in groups.
            </span>
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
