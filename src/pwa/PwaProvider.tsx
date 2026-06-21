import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "rl-pwa-install-dismissed-at";
const DISMISS_DAYS = 5; // banner returns after a few days

function detectIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ presents as "MacIntel" with touch — fold it in.
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

interface PwaContextValue {
  /** Android/Chromium captured a beforeinstallprompt — a one-tap install is available. */
  canInstall: boolean;
  isIos: boolean;
  isStandalone: boolean;
  promptInstall: () => Promise<void>;
  iosHelpOpen: boolean;
  openIosHelp: () => void;
  closeIosHelp: () => void;
  /** The dismissible banner should be shown right now. */
  bannerVisible: boolean;
  dismissBanner: () => void;
}

const PwaContext = createContext<PwaContextValue | null>(null);

export function PwaProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(detectStandalone);
  const [iosHelpOpen, setIosHelpOpen] = useState(false);
  const [dismissedAt, setDismissedAt] = useState(() => {
    const stored = Number(window.localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(stored) ? stored : 0;
  });
  const isIos = useMemo(detectIos, []);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setIsStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  const dismissBanner = () => {
    const now = Date.now();
    window.localStorage.setItem(DISMISS_KEY, String(now));
    setDismissedAt(now);
  };

  const recentlyDismissed =
    Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  const canInstall = deferred !== null;
  const bannerVisible =
    !isStandalone && !recentlyDismissed && (canInstall || isIos);

  const value: PwaContextValue = {
    canInstall,
    isIos,
    isStandalone,
    promptInstall,
    iosHelpOpen,
    openIosHelp: () => setIosHelpOpen(true),
    closeIosHelp: () => setIosHelpOpen(false),
    bannerVisible,
    dismissBanner,
  };

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa(): PwaContextValue {
  const ctx = useContext(PwaContext);
  if (!ctx) {
    throw new Error("usePwa must be used within PwaProvider");
  }
  return ctx;
}
