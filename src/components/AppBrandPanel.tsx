import { Waves } from "lucide-react";

export function AppBrandPanel() {
  return (
    <div className="app-brand-panel">
      <span className="brand-mark">
        <Waves size={22} strokeWidth={2.3} />
      </span>
      <div>
        <strong>
          River<span className="brand-launch">Launch</span>.app
        </strong>
        <span>Community river intelligence for paddlers.</span>
      </div>
    </div>
  );
}
