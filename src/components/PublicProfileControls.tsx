import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import {
  updateMyPublicProfile,
  type MemberProfile,
} from "../services/memberApi";

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Profile › Public control card: the master "make public" switch, an optional
 * handle + bio, and which sections to show. Saves via /api/me/public-profile.
 */
export function PublicProfileControls({
  profile,
  onSaved,
  onView,
}: {
  profile: MemberProfile | null;
  onSaved: (member: MemberProfile) => void;
  onView: (token: string) => void;
}) {
  const [isPublic, setIsPublic] = useState(profile?.profilePublic ?? false);
  const [handle, setHandle] = useState(profile?.handle ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [showPaddles, setShowPaddles] = useState(profile?.showPaddles ?? false);
  const [showSkills, setShowSkills] = useState(profile?.showSkills ?? false);
  const [showPhotos, setShowPhotos] = useState(profile?.showPhotos ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Re-sync when the saved profile changes (e.g. after a save elsewhere).
  useEffect(() => {
    setIsPublic(profile?.profilePublic ?? false);
    setHandle(profile?.handle ?? "");
    setBio(profile?.bio ?? "");
    setShowPaddles(profile?.showPaddles ?? false);
    setShowSkills(profile?.showSkills ?? false);
    setShowPhotos(profile?.showPhotos ?? false);
  }, [profile]);

  const publicUrl = profile
    ? `${window.location.origin}/p/${profile.handle ?? profile.id}`
    : "";

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateMyPublicProfile({
        profilePublic: isPublic,
        handle: handle.trim() || null,
        bio: bio.trim() || null,
        showPaddles,
        showSkills,
        showPhotos,
      });
      onSaved(updated);
      setMessage("Public profile saved.");
    } catch (saveError) {
      setError(errorText(saveError, "Could not save your public profile."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="public-profile-controls">
      <label className="toggle-line">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
        />
        Make my profile public
      </label>

      {isPublic ? (
        <>
          <div className="form-grid">
            <label>
              <span>Handle (optional)</span>
              <input
                type="text"
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                placeholder="e.g. alex-paddles"
                maxLength={30}
              />
            </label>
          </div>
          <label className="group-about-description">
            <span>Bio (optional)</span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="A line about your paddling."
              rows={4}
              maxLength={280}
            />
          </label>

          <fieldset className="public-profile-controls__sections">
            <legend>Show on my public profile</legend>
            <label className="toggle-line">
              <input
                type="checkbox"
                checked={showPaddles}
                onChange={(event) => setShowPaddles(event.target.checked)}
              />
              Paddles
            </label>
            <label className="toggle-line">
              <input
                type="checkbox"
                checked={showSkills}
                onChange={(event) => setShowSkills(event.target.checked)}
              />
              Skills
            </label>
            <label className="toggle-line">
              <input
                type="checkbox"
                checked={showPhotos}
                onChange={(event) => setShowPhotos(event.target.checked)}
              />
              Photos
            </label>
          </fieldset>

          {profile?.profilePublic ? (
            <div className="public-profile-controls__link">
              <code title={publicUrl}>{publicUrl}</code>
              <button
                type="button"
                className="ghost-button ghost-button--compact"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(publicUrl)
                    .then(() => {
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1800);
                    })
                    .catch(() => setError("Could not copy the link."));
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                className="ghost-button ghost-button--compact"
                onClick={() =>
                  profile && onView(profile.handle ?? profile.id)
                }
              >
                <ExternalLink size={14} /> View
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {error ? <p className="profile-message">{error}</p> : null}
      {message ? (
        <p className="profile-message profile-message--success">{message}</p>
      ) : null}

      <div className="profile-actions">
        <button
          type="button"
          className="primary-action"
          onClick={() => void save()}
          disabled={busy}
        >
          {busy ? "Saving" : "Save public profile"}
        </button>
      </div>
    </div>
  );
}
