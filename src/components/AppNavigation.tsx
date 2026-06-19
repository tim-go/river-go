import {
  ChevronLeft,
  ChevronRight,
  Compass,
  LayoutDashboard,
  Map as MapIcon,
  MoreHorizontal,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  Waves,
} from "lucide-react";
import type { AppSection } from "../types";

const appNavItems: Array<{
  id: AppSection;
  label: string;
  icon: typeof Search;
}> = [
  { id: "map", label: "Map", icon: MapIcon },
  { id: "discover", label: "Discover", icon: Compass },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "groups", label: "Groups", icon: UsersRound },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "more", label: "More", icon: MoreHorizontal },
];

// The mobile bottom bar shows a curated 5; the desktop rail keeps the full list.
const MOBILE_NAV_IDS: AppSection[] = [
  "map",
  "discover",
  "dashboard",
  "groups",
  "profile",
];

export function AppNavigation({
  activeSection,
  collapsed,
  isAdmin,
  isSignedIn,
  isAuthConfigured,
  memberLabel,
  memberMeta,
  memberRole,
  onToggleCollapsed,
  onSelectSection,
  onSignIn,
}: {
  activeSection: AppSection;
  collapsed: boolean;
  isAdmin: boolean;
  isSignedIn: boolean;
  isAuthConfigured: boolean;
  memberLabel: string;
  memberMeta: string;
  memberRole: string;
  onToggleCollapsed: () => void;
  onSelectSection: (section: AppSection) => void;
  onSignIn: () => void;
}) {
  const visibleNavItems = isAdmin
    ? [...appNavItems, { id: "admin" as const, label: "Admin", icon: ShieldCheck }]
    : appNavItems;

  return (
    <aside className={`app-nav ${collapsed ? "app-nav--collapsed" : ""}`}>
      <div className="app-nav__header">
        <div className="app-nav__brand" title="RiverLaunch.app">
          <span className="brand-mark brand-mark--nav">
            <Waves size={20} strokeWidth={2.3} />
          </span>
          <span>
            <strong>
              <span className="brand-river">River</span>
              <span className="brand-launch">Launch</span>.app
            </strong>
            <small>River intelligence</small>
          </span>
        </div>
        <button
          className="app-nav__toggle"
          type="button"
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      <nav aria-label="App sections">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`app-nav__item ${
                activeSection === item.id ? "app-nav__item--active" : ""
              }`}
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => onSelectSection(item.id)}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="app-nav__account">
        <button
          className="app-nav__account-main"
          type="button"
          title={
            isSignedIn
              ? `${memberLabel} · ${memberRole}`
              : "Create account or sign in"
          }
          onClick={isSignedIn ? () => onSelectSection("profile") : onSignIn}
          disabled={!isSignedIn && !isAuthConfigured}
        >
          <span className="app-nav__avatar">
            <UserRound size={18} />
          </span>
          <span className="app-nav__account-text">
            <strong>{memberLabel}</strong>
            <small>{memberMeta}</small>
          </span>
        </button>
        <span className="status-chip app-nav__account-role">{memberRole}</span>
      </div>
    </aside>
  );
}

export function MobileBottomNav({
  activeSection,
  onSelectSection,
}: {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="App sections">
      {appNavItems
        .filter((item) => MOBILE_NAV_IDS.includes(item.id))
        .map((item) => {
        const Icon = item.icon;
        return (
          <button
            className={`bottom-nav__item ${
              activeSection === item.id ||
              (activeSection === "admin" && item.id === "more")
                ? "bottom-nav__item--active"
                : ""
            }`}
            key={item.id}
            type="button"
            onClick={() => onSelectSection(item.id)}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
