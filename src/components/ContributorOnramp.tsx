import { FormEvent, useState } from "react";
import { Check, Mail, ShieldCheck, UserRound, Waves } from "lucide-react";
import { CONTRIBUTOR_TERMS_POINTS } from "../lib/contributorTerms";

export type ContributorActionResult = { ok: boolean; message?: string };

type BusyAction = "verify-resend" | "verify-refresh" | "name" | "terms";

/**
 * Walks a signed-in member through the one-time requirements for contributing to
 * shared community data: a verified email, a public contributor name, and
 * accepted contributor terms. The same checks are enforced server-side.
 */
export function ContributorOnramp({
  email,
  emailVerified,
  publicName,
  hasAcceptedTerms,
  onResendVerification,
  onRefreshVerification,
  onSetPublicName,
  onAcceptTerms,
  onReady,
  onClose,
}: {
  email: string | null;
  emailVerified: boolean;
  publicName: string | null;
  hasAcceptedTerms: boolean;
  onResendVerification: () => Promise<ContributorActionResult>;
  onRefreshVerification: () => Promise<ContributorActionResult>;
  onSetPublicName: (name: string) => Promise<ContributorActionResult>;
  onAcceptTerms: () => Promise<ContributorActionResult>;
  onReady: () => void;
  onClose: () => void;
}) {
  const hasPublicName = Boolean(publicName?.trim());
  const allMet = emailVerified && hasPublicName && hasAcceptedTerms;
  const [nameDraft, setNameDraft] = useState(publicName ?? "");
  const [isEditingName, setIsEditingName] = useState(!hasPublicName);
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function applyResult(result: ContributorActionResult) {
    setMessage(result.message ?? "");
    setIsError(!result.ok);
  }

  async function runAction(
    action: BusyAction,
    fn: () => Promise<ContributorActionResult>,
  ) {
    if (busy) {
      return;
    }
    setBusy(action);
    try {
      applyResult(await fn());
    } finally {
      setBusy(null);
    }
  }

  async function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) {
      return;
    }
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setMessage("Enter a public contributor name.");
      setIsError(true);
      return;
    }
    setBusy("name");
    try {
      const result = await onSetPublicName(trimmed);
      applyResult(result);
      if (result.ok) {
        setIsEditingName(false);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="auth-sheet-backdrop" role="presentation">
      <section
        className="auth-sheet auth-sheet--onramp contributor-onramp"
        role="dialog"
        aria-modal="true"
        aria-label="Become a contributor"
      >
        <div className="auth-sheet__content">
          <div className="auth-sheet__brand">
            <span className="brand-mark">
              <Waves size={22} strokeWidth={2.3} />
            </span>
            <span>Become a contributor</span>
          </div>
          <div>
            <p className="eyebrow">Shared community data</p>
            <h2>A few checks before you add local knowledge</h2>
            <p>
              Contributions are attributed to a known account so other paddlers
              can weigh what they read. You only need to do this once.
            </p>
          </div>
          {message ? (
            <p
              className={`profile-message ${
                isError ? "" : "profile-message--neutral"
              }`}
            >
              {message}
            </p>
          ) : null}

          <ol className="contributor-steps">
            <li
              className={`contributor-step ${
                emailVerified ? "contributor-step--done" : ""
              }`}
            >
              <span className="contributor-step__icon">
                {emailVerified ? <Check size={16} /> : <Mail size={16} />}
              </span>
              <div className="contributor-step__body">
                <h3>Verify your email</h3>
                {emailVerified ? (
                  <p>Verified{email ? ` — ${email}` : ""}.</p>
                ) : (
                  <>
                    <p>
                      We sent a link to {email ?? "your email"}. Open it, then
                      refresh here.
                    </p>
                    <div className="contributor-step__actions">
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={busy !== null}
                        onClick={() =>
                          void runAction("verify-refresh", onRefreshVerification)
                        }
                      >
                        {busy === "verify-refresh"
                          ? "Checking..."
                          : "I've verified — refresh"}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={busy !== null}
                        onClick={() =>
                          void runAction("verify-resend", onResendVerification)
                        }
                      >
                        {busy === "verify-resend" ? "Sending..." : "Resend email"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </li>

            <li
              className={`contributor-step ${
                hasPublicName && !isEditingName ? "contributor-step--done" : ""
              }`}
            >
              <span className="contributor-step__icon">
                {hasPublicName && !isEditingName ? (
                  <Check size={16} />
                ) : (
                  <UserRound size={16} />
                )}
              </span>
              <div className="contributor-step__body">
                <h3>Choose a public contributor name</h3>
                {hasPublicName && !isEditingName ? (
                  <p>
                    You'll post as <strong>{publicName}</strong>.{" "}
                    <button
                      type="button"
                      className="contributor-step__link"
                      onClick={() => setIsEditingName(true)}
                    >
                      Change
                    </button>
                  </p>
                ) : (
                  <form className="contributor-name-form" onSubmit={submitName}>
                    <input
                      value={nameDraft}
                      onChange={(event) => setNameDraft(event.target.value)}
                      placeholder="e.g. Tryweryn Tom"
                      maxLength={40}
                      aria-label="Public contributor name"
                    />
                    <button
                      type="submit"
                      className="ghost-button"
                      disabled={busy !== null}
                    >
                      {busy === "name" ? "Saving..." : "Save name"}
                    </button>
                  </form>
                )}
                <p className="contributor-step__hint">
                  Shown on what you add — not your email.
                </p>
              </div>
            </li>

            <li
              className={`contributor-step ${
                hasAcceptedTerms ? "contributor-step--done" : ""
              }`}
            >
              <span className="contributor-step__icon">
                {hasAcceptedTerms ? (
                  <Check size={16} />
                ) : (
                  <ShieldCheck size={16} />
                )}
              </span>
              <div className="contributor-step__body">
                <h3>Accept the contributor terms</h3>
                {hasAcceptedTerms ? (
                  <p>Accepted. Thank you.</p>
                ) : (
                  <>
                    <ul className="contributor-terms-points">
                      {CONTRIBUTOR_TERMS_POINTS.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={busy !== null}
                      onClick={() => void runAction("terms", onAcceptTerms)}
                    >
                      {busy === "terms" ? "Saving..." : "Accept & continue"}
                    </button>
                  </>
                )}
              </div>
            </li>
          </ol>

          <div className="auth-sheet__actions contributor-onramp__footer">
            <button type="button" className="ghost-button" onClick={onClose}>
              Not now
            </button>
            <button
              type="button"
              className="primary-action"
              disabled={!allMet}
              onClick={onReady}
            >
              {allMet ? "Start contributing" : "Complete the steps above"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
