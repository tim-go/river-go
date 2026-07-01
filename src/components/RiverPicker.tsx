import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

export interface RiverPickerOption {
  id: string;
  displayName: string;
  region: string | null;
}

/**
 * A searchable, region-grouped river picker. Renders a trigger button showing
 * the current selection; clicking opens a modal with a search box and the
 * rivers grouped under region headers. Client-side over the passed list.
 */
export function RiverPicker({
  rivers,
  value,
  onChange,
  placeholder = "Choose a river",
  allowClear = false,
}: {
  rivers: RiverPickerOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = rivers.find((river) => river.id === value) ?? null;

  // Reset + focus the search each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byRegion = new Map<string, RiverPickerOption[]>();
    for (const river of rivers) {
      if (
        q &&
        !river.displayName.toLowerCase().includes(q) &&
        !(river.region ?? "").toLowerCase().includes(q)
      ) {
        continue;
      }
      const key = river.region?.trim() || "Other";
      const list = byRegion.get(key) ?? [];
      list.push(river);
      byRegion.set(key, list);
    }
    return [...byRegion.entries()]
      .map(
        ([region, list]) =>
          [
            region,
            [...list].sort((a, b) =>
              a.displayName.localeCompare(b.displayName),
            ),
          ] as const,
      )
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [rivers, query]);

  const matchCount = groups.reduce((n, [, list]) => n + list.length, 0);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div className="river-picker">
      <button
        type="button"
        className="river-picker__trigger"
        onClick={() => setOpen(true)}
      >
        <span className={selected ? "" : "river-picker__placeholder"}>
          {selected ? selected.displayName : placeholder}
        </span>
        <ChevronDown size={16} />
      </button>

      {open ? (
        <div
          className="auth-sheet-backdrop auth-sheet-backdrop--modal"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="river-picker__panel"
            role="dialog"
            aria-label="Choose a river"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="river-picker__search">
              <Search size={16} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search rivers…"
              />
              <button
                type="button"
                className="river-picker__close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="river-picker__list">
              {allowClear ? (
                <button
                  type="button"
                  className="river-picker__option river-picker__option--clear"
                  onClick={() => pick("")}
                >
                  No river
                </button>
              ) : null}

              {matchCount === 0 ? (
                <p className="empty-state">No rivers match “{query.trim()}”.</p>
              ) : (
                groups.map(([region, list]) => (
                  <div key={region} className="river-picker__group">
                    <p className="river-picker__group-head">{region}</p>
                    {list.map((river) => (
                      <button
                        key={river.id}
                        type="button"
                        className={`river-picker__option${
                          river.id === value
                            ? " river-picker__option--selected"
                            : ""
                        }`}
                        onClick={() => pick(river.id)}
                      >
                        {river.displayName}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
