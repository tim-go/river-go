import { useEffect, type ReactNode } from "react";

export interface ConfirmDialogProps {
  /** Small label above the title (e.g. "Remove member"). */
  eyebrow?: string;
  title: string;
  /** Body content — pass one or more <p> nodes. */
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * An in-app confirmation modal (replaces window.confirm), reusing the app's
 * existing .confirm-panel modal styling. Backdrop click and Escape cancel.
 */
export function ConfirmDialog({
  eyebrow,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="auth-sheet-backdrop"
      role="presentation"
      onClick={onCancel}
    >
      <section
        className="confirm-panel confirm-panel--modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h3>{title}</h3>
          {body}
        </div>
        <div className="form-actions">
          <button className="ghost-button" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="submit-button" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
