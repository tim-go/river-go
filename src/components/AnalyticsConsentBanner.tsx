export function AnalyticsConsentBanner({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <section className="analytics-consent-banner" aria-label="Analytics consent">
      <div>
        <strong>Help improve RiverLaunch.app</strong>
        <span>
          We use Firebase Analytics only if you agree. It helps us understand
          which routes, maps, and tools are useful.
        </span>
      </div>
      <div className="analytics-consent-banner__actions">
        <button className="ghost-button ghost-button--compact" type="button" onClick={onDecline}>
          Not now
        </button>
        <button className="primary-action primary-action--compact" type="button" onClick={onAccept}>
          Allow
        </button>
      </div>
    </section>
  );
}
