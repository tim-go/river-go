import { useEffect, useMemo, useState } from "react";
import { EntityPage, type EntityTab } from "./EntityPage";
import { Avatar } from "./Avatar";
import type { PhotoLightboxItem } from "../types";
import {
  fetchPublicProfile,
  type PublicProfile,
} from "../services/publicProfileApi";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Public, read-only paddler profile at /p/<handle-or-id>. Shows the member's
 * avatar, name, bio and whichever sections they opted into (paddles, skills,
 * photos). onBack returns to the page the visitor came from.
 */
export function PublicProfilePage({
  token,
  onBack,
  backLabel,
  onOpenPhoto,
}: {
  token: string;
  onBack: () => void;
  backLabel: string;
  onOpenPhoto: (item: PhotoLightboxItem) => void;
}) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">(
    "loading",
  );
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    let active = true;
    setState("loading");
    fetchPublicProfile(token)
      .then((result) => {
        if (!active) return;
        if (!result) {
          setState("missing");
          return;
        }
        setProfile(result);
        setState("ready");
        // Prefer the handle in the address bar (nicer + shareable) once loaded,
        // even when the visitor arrived via /p/<id>.
        if (
          result.handle &&
          window.location.pathname !== `/p/${result.handle}`
        ) {
          window.history.replaceState(
            {},
            "",
            `/p/${encodeURIComponent(result.handle)}`,
          );
        }
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [token]);

  const tabs = useMemo<EntityTab[]>(() => {
    if (!profile) return [];
    const list: EntityTab[] = [];
    if (profile.showPaddles) list.push({ id: "paddles", label: "Paddles" });
    if (profile.showSkills) list.push({ id: "skills", label: "Skills" });
    if (profile.showPhotos) list.push({ id: "photos", label: "Photos" });
    return list;
  }, [profile]);

  // Default to the first available tab.
  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  if (state === "loading") {
    return (
      <div className="public-profile">
        <button type="button" className="entity-page__back" onClick={onBack}>
          ‹ {backLabel}
        </button>
        <p className="empty-state">Loading…</p>
      </div>
    );
  }

  if (state === "missing" || state === "error" || !profile) {
    return (
      <div className="public-profile">
        <button type="button" className="entity-page__back" onClick={onBack}>
          ‹ {backLabel}
        </button>
        <div className="sign-in-card">
          <h3>
            {state === "error"
              ? "Couldn’t load this profile"
              : "Paddler not found"}
          </h3>
          <p>
            {state === "error"
              ? "Something went wrong — try again."
              : "We couldn’t find this paddler."}
          </p>
        </div>
      </div>
    );
  }

  const skillsByCategory = new Map<string, PublicProfile["skills"]>();
  for (const skill of profile.skills) {
    const list = skillsByCategory.get(skill.category) ?? [];
    list.push(skill);
    skillsByCategory.set(skill.category, list);
  }

  const body = () => {
    if (activeTab === "paddles") {
      return profile.paddles.length ? (
        <ul className="public-profile__paddles">
          {profile.paddles.map((paddle) => (
            <li key={paddle.id} className="public-profile__paddle">
              <strong>{paddle.title}</strong>
              <small>
                {formatDate(paddle.paddledOn)}
                {paddle.venue ? ` · ${paddle.venue}` : ""}
                {paddle.craftType ? ` · ${paddle.craftType}` : ""}
                {paddle.levelNote ? ` · ${paddle.levelNote}` : ""}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-state">No public paddles yet.</p>
      );
    }
    if (activeTab === "skills") {
      return profile.skills.length ? (
        <div className="public-profile__skills">
          {[...skillsByCategory.entries()].map(([category, list]) => (
            <div key={category} className="public-profile__skill-group">
              <h4>{category}</h4>
              <ul>
                {list.map((skill) => (
                  <li key={skill.id}>
                    <strong>{skill.name}</strong>
                    {skill.detail ? <small>{skill.detail}</small> : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">No skills listed yet.</p>
      );
    }
    if (activeTab === "photos") {
      return profile.photos.length ? (
        <div className="public-profile__photos">
          {profile.photos.map((photo) => (
            <img
              key={photo.id}
              src={photo.thumbnailUrl ?? photo.displayUrl ?? undefined}
              alt={photo.caption || "Paddler photo"}
              loading="lazy"
            />
          ))}
        </div>
      ) : (
        <p className="empty-state">No photos yet.</p>
      );
    }
    return null;
  };

  return (
    <div className="public-profile">
      <EntityPage
        backLabel={backLabel}
        onBack={onBack}
        icon={
          profile.avatar ? (
            <button
              type="button"
              className="public-profile__avatar-button"
              onClick={() =>
                onOpenPhoto({
                  src: profile.avatar!.imageUrl,
                  title: profile.publicName,
                  alt: `${profile.publicName}'s profile picture`,
                })
              }
              aria-label="View profile picture"
            >
              <Avatar
                name={profile.publicName}
                avatar={profile.avatar}
                size={84}
              />
            </button>
          ) : (
            <Avatar name={profile.publicName} avatar={profile.avatar} size={84} />
          )
        }
        title={profile.publicName}
        subtitle={profile.handle ? `@${profile.handle}` : undefined}
        meta={profile.bio ?? undefined}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {tabs.length ? (
          body()
        ) : (
          <p className="empty-state">
            {profile.profilePublic
              ? "This paddler hasn’t shared any sections yet."
              : "This paddler hasn’t set up a public profile yet."}
          </p>
        )}
      </EntityPage>
    </div>
  );
}
