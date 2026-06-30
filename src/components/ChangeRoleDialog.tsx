import { useEffect, useState } from "react";
import type { GroupRole } from "../types";

const ROLE_LABELS: Record<GroupRole, string> = {
  owner: "Owner",
  organiser: "Organiser",
  leader: "Leader",
  member: "Member",
};

// Assignable roles (owner is set via ownership transfer, not here) with a short
// summary of what each can do — kept in step with the roles-and-permissions doc.
const ROLE_OPTIONS: { value: GroupRole; description: string }[] = [
  {
    value: "organiser",
    description:
      "Full admin — manage settings, members, roles, and sessions (not ownership transfer).",
  },
  {
    value: "leader",
    description:
      "Runs sessions and invites/approves members. Can't remove members or change settings.",
  },
  {
    value: "member",
    description: "Views the group, RSVPs to sessions, and shares the group link.",
  },
];

export interface ChangeRoleDialogProps {
  memberName: string;
  currentRole: GroupRole;
  /** The acting user is the owner — offer the ownership-transfer special case. */
  canTransferOwnership: boolean;
  onSave: (role: GroupRole) => void;
  onTransfer: () => void;
  onCancel: () => void;
}

export function ChangeRoleDialog({
  memberName,
  currentRole,
  canTransferOwnership,
  onSave,
  onTransfer,
  onCancel,
}: ChangeRoleDialogProps) {
  const [selected, setSelected] = useState<GroupRole>(
    currentRole === "owner" ? "organiser" : currentRole,
  );

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
    <div className="auth-sheet-backdrop" role="presentation" onClick={onCancel}>
      <section
        className="role-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Change ${memberName}'s role`}
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <p className="eyebrow">Change role</p>
          <h3>{memberName}</h3>
          <p className="role-dialog__current">
            Currently {ROLE_LABELS[currentRole]}.
          </p>
        </div>

        <div className="role-options">
          {ROLE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`role-option${
                selected === option.value ? " role-option--selected" : ""
              }`}
            >
              <input
                type="radio"
                name="member-role"
                value={option.value}
                checked={selected === option.value}
                onChange={() => setSelected(option.value)}
              />
              <span className="role-option__body">
                <strong>{ROLE_LABELS[option.value]}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          ))}
        </div>

        <div className="form-actions">
          <button className="ghost-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="submit-button"
            type="button"
            disabled={selected === currentRole}
            onClick={() => onSave(selected)}
          >
            Save role
          </button>
        </div>

        {canTransferOwnership ? (
          <div className="role-dialog__transfer">
            <h4>Transfer ownership</h4>
            <p>
              Make {memberName} the owner. You'll become an organiser and lose
              owner controls — only the new owner can transfer it back.
            </p>
            <button
              type="button"
              className="role-dialog__transfer-btn"
              onClick={onTransfer}
            >
              Transfer ownership to {memberName}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
