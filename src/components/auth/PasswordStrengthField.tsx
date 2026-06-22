import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import {
  evaluatePassword,
  type PasswordPolicyStatus,
} from "../../lib/passwordPolicy";
import "./password-field.css";

type Scorer = (password: string) => number;

interface PasswordStrengthFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onStatusChange?: (status: PasswordPolicyStatus) => void;
  autoComplete?: string;
  disabled?: boolean;
}

export function PasswordStrengthField({
  id,
  label,
  value,
  onChange,
  onStatusChange,
  autoComplete = "new-password",
  disabled,
}: PasswordStrengthFieldProps) {
  const [scorer, setScorer] = useState<Scorer | null>(null);
  const [reveal, setReveal] = useState(false);

  // Lazy-load the zxcvbn dictionary (heavy) into its own chunk.
  useEffect(() => {
    let active = true;
    void (async () => {
      const [core, common] = await Promise.all([
        import("@zxcvbn-ts/core"),
        import("@zxcvbn-ts/language-common"),
      ]);
      const factory = new core.ZxcvbnFactory({
        dictionary: common.dictionary,
        graphs: common.adjacencyGraphs,
      });
      if (active) {
        setScorer(() => (password: string) => factory.check(password).score);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const score = useMemo(() => {
    if (!value) return 0;
    if (scorer) return scorer(value);
    // Provisional estimate until zxcvbn finishes loading.
    return value.length >= 12 ? 2 : 1;
  }, [value, scorer]);

  const status = useMemo(() => evaluatePassword(value, score), [value, score]);

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  const started = value.length > 0;

  return (
    <div className="pw-field">
      <label className="pw-field__label" htmlFor={id}>
        {label}
        <div className="pw-field__input-wrap">
          <input
            id={id}
            type={reveal ? "text" : "password"}
            autoComplete={autoComplete}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            aria-invalid={started && !status.valid}
          />
          <button
            type="button"
            className="pw-field__reveal"
            onClick={() => setReveal((current) => !current)}
            aria-label={reveal ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>

      {started ? (
        <div className="pw-field__feedback" data-strength={status.strengthLabel}>
          <div className="pw-meter" aria-hidden="true">
            {[0, 1, 2, 3].map((segment) => (
              <span
                key={segment}
                className={`pw-meter__seg${
                  segment < Math.max(1, status.score) ? " pw-meter__seg--on" : ""
                }`}
              />
            ))}
          </div>
          <ul className="pw-reqs">
            <Requirement ok={status.lengthOk}>At least 12 characters</Requirement>
            <Requirement ok={status.scoreOk}>Not easily guessed</Requirement>
            <Requirement ok={status.noOuterWhitespace}>
              No leading or trailing spaces
            </Requirement>
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Requirement({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className={`pw-req${ok ? " pw-req--ok" : ""}`}>
      <span className="pw-req__icon" aria-hidden="true">
        {ok ? <Check size={13} /> : <X size={13} />}
      </span>
      <span>{children}</span>
    </li>
  );
}
