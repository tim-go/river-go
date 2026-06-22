import type { ReactNode } from "react";

// Standard "you need an account" notice for signed-out users on the gated
// sections (Dashboard, Groups, Profile). Reuses the dashboard-empty styling.
export function SignedOutNotice({
  message,
  onSignIn,
  children,
}: {
  message: string;
  onSignIn: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="dashboard-empty">
      <p>{message}</p>
      <button type="button" className="primary-action" onClick={onSignIn}>
        Sign in
      </button>
      {children}
    </div>
  );
}
