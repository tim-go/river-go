import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Waves } from "lucide-react";
import {
  applyEmailVerificationCode,
  confirmPasswordResetWithCode,
  verifyPasswordResetOobCode,
} from "../services/firebaseAuth";
import { PasswordStrengthField } from "../components/auth/PasswordStrengthField";
import {
  validatePasswordConfirmation,
  type PasswordPolicyStatus,
} from "../lib/passwordPolicy";

type Status = "checking" | "ready" | "success" | "error";

type State = {
  status: Status;
  title: string;
  message: string;
  email?: string | null;
};

// ?preview=… renders each state without a real Firebase code, for local design review.
function normalisePreview(value: string | null): string | null {
  const preview = value?.trim();
  if (!preview) return null;
  if (["reset", "resetPassword", "password-reset"].includes(preview)) return "resetPassword";
  if (["resetSuccess", "password-reset-success"].includes(preview)) return "resetSuccess";
  if (["verify", "verifyEmail", "email-verified"].includes(preview)) return "verifyEmail";
  if (["error", "invalid", "expired"].includes(preview)) return "error";
  return null;
}

function errorMessage(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  const messages: Record<string, string> = {
    "auth/expired-action-code": "This link has expired. Please request a new one.",
    "auth/invalid-action-code": "This link is invalid or has already been used.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/weak-password": "Please choose a stronger password (at least 6 characters).",
  };
  return messages[code] ?? "Something went wrong. Please request a new link.";
}

export function AuthActionPage() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const oobCode = params.get("oobCode");
  // Any ?preview value turns on preview mode (e.g. ?preview=true); unknown values
  // default to the verify state, and the switcher bar links to the rest.
  const inPreview = params.get("preview") !== null;
  const preview =
    normalisePreview(params.get("preview")) ?? (inPreview ? "verifyEmail" : null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pwStatus, setPwStatus] = useState<PasswordPolicyStatus | null>(null);
  const [state, setState] = useState<State>({
    status: "checking",
    title: "Checking your link…",
    message: "One moment while we verify this link.",
  });

  useEffect(() => {
    let active = true;

    async function run() {
      if (preview === "resetPassword") {
        setState({
          status: "ready",
          title: "Set a new password",
          message: "Choose a new password for your account.",
          email: "paddler@example.com",
        });
        return;
      }
      if (preview === "resetSuccess") {
        setState({
          status: "success",
          title: "Password updated",
          message: "You can now sign in with your new password.",
        });
        return;
      }
      if (preview === "verifyEmail") {
        setState({
          status: "success",
          title: "Email verified",
          message: "Thanks — your email address is confirmed.",
        });
        return;
      }
      if (preview === "error") {
        setState({
          status: "error",
          title: "This link can't be used",
          message: "This link is invalid or has already been used.",
        });
        return;
      }

      if (!mode || !oobCode) {
        setState({
          status: "error",
          title: "Invalid link",
          message: "This link is missing information. Please request a new one.",
        });
        return;
      }

      try {
        if (mode === "resetPassword") {
          const email = await verifyPasswordResetOobCode(oobCode);
          if (!active) return;
          setState({
            status: "ready",
            title: "Set a new password",
            message: "Choose a new password for your account.",
            email,
          });
          return;
        }
        if (mode === "verifyEmail") {
          await applyEmailVerificationCode(oobCode);
          if (!active) return;
          setState({
            status: "success",
            title: "Email verified",
            message: "Thanks — your email address is confirmed.",
          });
          return;
        }
        setState({
          status: "error",
          title: "Unsupported link",
          message: "This type of link isn't supported.",
        });
      } catch (error) {
        if (!active) return;
        setState({
          status: "error",
          title: "This link can't be used",
          message: errorMessage(error),
        });
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [mode, oobCode, preview]);

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!pwStatus?.valid) {
      setFormError(pwStatus?.message ?? "Choose a stronger password.");
      return;
    }
    const confirmError = validatePasswordConfirmation(password, confirm);
    if (confirmError) {
      setFormError(confirmError);
      return;
    }
    setSubmitting(true);
    try {
      if (!preview) {
        await confirmPasswordResetWithCode(oobCode as string, password);
      }
      setState({
        status: "success",
        title: "Password updated",
        message: "You can now sign in with your new password.",
      });
      setPassword("");
      setConfirm("");
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const showResetForm =
    state.status === "ready" && (mode === "resetPassword" || preview === "resetPassword");

  return (
    <main className="auth-action">
      {inPreview ? (
        <nav className="auth-action__preview-bar" aria-label="Preview states">
          <span>Preview</span>
          <a href="/auth/action?preview=verifyEmail">verify</a>
          <a href="/auth/action?preview=resetPassword">reset form</a>
          <a href="/auth/action?preview=resetSuccess">reset done</a>
          <a href="/auth/action?preview=error">error</a>
        </nav>
      ) : null}
      <div className="auth-action__card">
        <span className="auth-action__mark" aria-hidden="true">
          <Waves size={26} strokeWidth={2.3} />
        </span>
        <div className="auth-action__icon" aria-hidden="true">
          {state.status === "success" ? (
            <CheckCircle2 size={30} />
          ) : state.status === "error" ? (
            <AlertCircle size={30} />
          ) : state.status === "checking" ? (
            <span className="auth-action__spinner" />
          ) : null}
        </div>
        <h1>{state.title}</h1>
        <p>{state.message}</p>
        {state.email ? <p className="auth-action__email">{state.email}</p> : null}

        {showResetForm ? (
          <form className="auth-action__form" onSubmit={handleReset}>
            <PasswordStrengthField
              label="New password"
              value={password}
              onChange={setPassword}
              onStatusChange={setPwStatus}
              disabled={submitting}
            />
            <label>
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
            {formError ? <p className="auth-action__error">{formError}</p> : null}
            <button
              type="submit"
              className="auth-action__submit"
              disabled={
                submitting || !pwStatus?.valid || password !== confirm || !confirm
              }
            >
              {submitting ? "Updating…" : "Update password"}
            </button>
          </form>
        ) : null}

        {state.status === "success" || state.status === "error" ? (
          <a className="auth-action__continue" href="/">
            Continue to RiverLaunch.app
          </a>
        ) : null}
      </div>
    </main>
  );
}
