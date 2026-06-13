import { Navigation } from "lucide-react";

export function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Navigation;
  label: string;
  value: string;
}) {
  return (
    <div className="metric">
      <Icon size={17} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
