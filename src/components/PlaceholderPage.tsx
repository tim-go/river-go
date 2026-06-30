import type { ReactNode } from "react";
import type { AppSection } from "../types";

export function PlaceholderPage({
  section,
  title,
  children,
  wide = false,
}: {
  section: AppSection;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`app-page app-page--${section}`} aria-label={title}>
      <div
        className={`app-page__header${wide ? " app-page__header--wide" : ""}`}
      >
        <h2>{title}</h2>
      </div>
      <div
        className={`app-page__content${wide ? " app-page__content--wide" : ""}`}
      >
        {children}
      </div>
    </section>
  );
}
