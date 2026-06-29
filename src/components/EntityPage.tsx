import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

export interface EntityTab {
  id: string;
  label: string;
}

interface EntityPageProps {
  /** Identity icon/avatar shown beside the title. */
  icon?: ReactNode;
  title: string;
  /** e.g. a @handle line. */
  subtitle?: ReactNode;
  /** A meta/chips line under the title. */
  meta?: ReactNode;
  /** Right-aligned header actions (buttons, menu). */
  actions?: ReactNode;
  /** Optional subtle breadcrumb-style back link above the identity. */
  backLabel?: string;
  onBack?: () => void;
  /** Optional cover banner shown above the header. position = vertical % crop. */
  cover?: { url: string; position: number };
  tabs: EntityTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  /** Active tab panel body. */
  children: ReactNode;
  /** Optional persistent right gutter (stats + contextual controls). */
  aside?: ReactNode;
}

/**
 * A reusable "entity page" shell: an identity header + a horizontal tab bar +
 * the active tab's body. Presentational and generic — used for the group page
 * now, and for paddler profiles later.
 */
export function EntityPage({
  icon,
  title,
  subtitle,
  meta,
  actions,
  backLabel,
  onBack,
  cover,
  tabs,
  activeTab,
  onTabChange,
  children,
  aside,
}: EntityPageProps) {
  return (
    <div className="entity-page">
      {cover ? (
        <div
          className="entity-page__cover"
          style={{
            backgroundImage: `url(${cover.url})`,
            backgroundPosition: `50% ${cover.position}%`,
          }}
        />
      ) : null}
      <header className="entity-page__header">
        <div className="entity-page__identity">
          {onBack ? (
            <button
              type="button"
              className="entity-page__back"
              onClick={onBack}
            >
              <ChevronLeft size={15} /> {backLabel ?? "Back"}
            </button>
          ) : null}
          <div className="entity-page__heading">
            {icon ? <span className="entity-page__icon">{icon}</span> : null}
            <div className="entity-page__titles">
              <h2>{title}</h2>
              {subtitle ? (
                <p className="entity-page__subtitle">{subtitle}</p>
              ) : null}
              {meta ? <p className="entity-page__meta">{meta}</p> : null}
            </div>
          </div>
        </div>
        {actions ? (
          <div className="entity-page__actions">{actions}</div>
        ) : null}
      </header>

      <nav className="entity-page__tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTab}
            className={`entity-page__tab${
              tab.id === activeTab ? " entity-page__tab--active" : ""
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="entity-page__body">
        {aside ? (
          <div className="content-columns">
            <div className="content-columns__main">{children}</div>
            <aside className="content-columns__aside">{aside}</aside>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
