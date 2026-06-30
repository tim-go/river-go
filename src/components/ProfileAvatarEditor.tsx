import { useRef, useState } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";
import { Camera, Crop, Trash2 } from "lucide-react";
import { uploadProfileAvatar } from "../services/profileAvatarUpload";
import { updateMyAvatar, type MemberProfile } from "../services/memberApi";
import { Avatar } from "./Avatar";

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Account-page profile picture editor: upload, then drag + zoom to frame the
 * headshot in a circle (mirrors the group cover controls), or remove it.
 */
export function ProfileAvatarEditor({
  profile,
  onSaved,
}: {
  profile: MemberProfile | null;
  onSaved: (member: MemberProfile) => void;
}) {
  const name = profile?.publicName ?? profile?.displayName ?? null;
  const savedUrl = profile?.avatarImageUrl ?? null;

  const [editing, setEditing] = useState(false);
  // A freshly uploaded but not-yet-saved picture; falls back to the saved one
  // when reframing an existing avatar.
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [xDraft, setXDraft] = useState(profile?.avatarX ?? 50);
  const [positionDraft, setPositionDraft] = useState(profile?.avatarPosition ?? 50);
  const [zoomDraft, setZoomDraft] = useState(profile?.avatarZoom ?? 100);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dragStart = useRef({ px: 0, py: 0, x: 50, y: 50 });
  const fileRef = useRef<HTMLInputElement | null>(null);

  const editUrl = pendingUrl ?? savedUrl;

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file for your picture.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("Image is too large — max 12 MB.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const { url } = await uploadProfileAvatar(file);
      setPendingUrl(url);
      // New photo → start framing from centre.
      setXDraft(50);
      setPositionDraft(50);
      setZoomDraft(100);
      setEditing(true);
    } catch (uploadError) {
      setError(errorText(uploadError, "Could not upload the picture."));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!editUrl) return;
    setBusy(true);
    setError("");
    try {
      const updated = await updateMyAvatar({
        imageUrl: editUrl,
        x: xDraft,
        position: positionDraft,
        zoom: zoomDraft,
      });
      onSaved(updated);
      setPendingUrl(null);
      setEditing(false);
    } catch (saveError) {
      setError(errorText(saveError, "Could not save the picture."));
    } finally {
      setBusy(false);
    }
  }

  function startReframe() {
    setPendingUrl(null);
    setXDraft(profile?.avatarX ?? 50);
    setPositionDraft(profile?.avatarPosition ?? 50);
    setZoomDraft(profile?.avatarZoom ?? 100);
    setEditing(true);
  }

  function cancelEdit() {
    setPendingUrl(null);
    setXDraft(profile?.avatarX ?? 50);
    setPositionDraft(profile?.avatarPosition ?? 50);
    setZoomDraft(profile?.avatarZoom ?? 100);
    setEditing(false);
  }

  async function handleRemove() {
    setBusy(true);
    setError("");
    try {
      const updated = await updateMyAvatar({ imageUrl: null });
      onSaved(updated);
      setPendingUrl(null);
      setEditing(false);
    } catch (removeError) {
      setError(errorText(removeError, "Could not remove the picture."));
    } finally {
      setBusy(false);
    }
  }

  // Drag the circle to pan the picture (same maths as the group cover).
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    dragStart.current = {
      px: event.clientX,
      py: event.clientY,
      x: xDraft,
      y: positionDraft,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const start = dragStart.current;
    const clamp = (value: number) => Math.min(100, Math.max(0, value));
    setXDraft(
      Math.round(clamp(start.x - ((event.clientX - start.px) / rect.width) * 100)),
    );
    setPositionDraft(
      Math.round(clamp(start.y - ((event.clientY - start.py) / rect.height) * 100)),
    );
  }
  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="avatar-editor">
      {editing && editUrl ? (
        <>
          <div
            className={`avatar-editor__frame${
              dragging ? " avatar-editor__frame--dragging" : ""
            }`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <img
              className="avatar-editor__img"
              src={editUrl}
              alt=""
              draggable={false}
              style={{
                objectPosition: `${xDraft}% ${positionDraft}%`,
                transformOrigin: `${xDraft}% ${positionDraft}%`,
                transform: `scale(${zoomDraft / 100})`,
              }}
            />
          </div>
          <p className="avatar-editor__hint">Drag to reposition.</p>
          <label className="avatar-editor__zoom">
            Zoom
            <input
              type="range"
              min={100}
              max={300}
              step={5}
              value={zoomDraft}
              onChange={(event) => setZoomDraft(Number(event.target.value))}
            />
          </label>
          <div className="avatar-editor__actions">
            <button
              type="button"
              className="ghost-button ghost-button--compact"
              onClick={cancelEdit}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="primary-action primary-action--compact"
              onClick={() => void handleSave()}
              disabled={busy}
            >
              Save picture
            </button>
          </div>
        </>
      ) : (
        <div className="avatar-editor__view">
          <Avatar
            name={name}
            avatar={
              savedUrl
                ? {
                    imageUrl: savedUrl,
                    x: profile?.avatarX ?? 50,
                    position: profile?.avatarPosition ?? 50,
                    zoom: profile?.avatarZoom ?? 100,
                  }
                : null
            }
            size={88}
          />
          <div className="avatar-editor__buttons">
            <button
              type="button"
              className="ghost-button ghost-button--compact"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || busy}
            >
              <Camera size={15} />{" "}
              {uploading
                ? "Uploading…"
                : savedUrl
                  ? "Change picture"
                  : "Add picture"}
            </button>
            {savedUrl ? (
              <>
                <button
                  type="button"
                  className="ghost-button ghost-button--compact"
                  onClick={startReframe}
                  disabled={busy}
                >
                  <Crop size={15} /> Reframe
                </button>
                <button
                  type="button"
                  className="ghost-button ghost-button--compact ghost-button--danger"
                  onClick={() => void handleRemove()}
                  disabled={busy}
                >
                  <Trash2 size={15} /> Remove
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}
      {error ? <p className="profile-message profile-message--error">{error}</p> : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        disabled={uploading}
        onChange={(event) => void handleUpload(event)}
      />
    </div>
  );
}
