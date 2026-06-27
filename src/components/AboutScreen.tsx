import { ChevronLeft, Info } from "lucide-react";
import { AppBrandPanel } from "./AppBrandPanel";
import { PlaceholderPage } from "./PlaceholderPage";

function formatBuiltAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AboutScreen({ onBack }: { onBack: () => void }) {
  const sha = __APP_GIT_SHA__;
  return (
    <PlaceholderPage section="about" title="About">
      <button
        className="ghost-button ghost-button--compact"
        type="button"
        onClick={onBack}
      >
        <ChevronLeft size={15} />
        More
      </button>
      <AppBrandPanel />
      <section className="settings-panel" aria-label="App version">
        <div className="settings-panel__header">
          <span>
            <strong>Version</strong>
            <small>
              v{__APP_VERSION__}
              {sha && sha !== "dev" ? ` · ${sha}` : ""}
            </small>
          </span>
          <Info size={18} />
        </div>
        <p className="source-note">Built {formatBuiltAt(__APP_BUILT_AT__)}</p>
      </section>
    </PlaceholderPage>
  );
}
