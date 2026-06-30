import type { MemberAvatar } from "../types";

function initialsFor(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * A circular member avatar. Shows the uploaded picture (framed via x/position/
 * zoom) when present, otherwise initials on a tinted disc. Size is in pixels.
 */
export function Avatar({
  name,
  avatar,
  size = 36,
  className = "",
}: {
  name: string | null | undefined;
  avatar?: MemberAvatar | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`avatar ${className}`}
      style={{ width: size, height: size }}
    >
      {avatar?.imageUrl ? (
        <img
          className="avatar__img"
          src={avatar.imageUrl}
          alt=""
          draggable={false}
          style={{
            objectPosition: `${avatar.x}% ${avatar.position}%`,
            transformOrigin: `${avatar.x}% ${avatar.position}%`,
            transform: `scale(${avatar.zoom / 100})`,
          }}
        />
      ) : (
        <span
          className="avatar__initials"
          style={{ fontSize: Math.round(size * 0.4) }}
        >
          {initialsFor(name)}
        </span>
      )}
    </span>
  );
}
