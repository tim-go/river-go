import type { ReactNode } from "react";
import type { AppSection } from "../types";

export function PlaceholderPage({
  section,
  title,
  children,
}: {
  section: AppSection;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={`app-page app-page--${section}`} aria-label={title}>
      <div className="app-page__header">
        <h2>{title}</h2>
      </div>
      <div className="app-page__content">{children}</div>
    </section>
  );
}
