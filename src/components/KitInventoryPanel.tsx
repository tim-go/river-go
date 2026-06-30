import { FormEvent, useEffect, useMemo, useState } from "react";
import type { KitItem } from "../types";
import {
  createKitItem,
  deleteKitItem,
  fetchKitItems,
  updateKitItem,
} from "../services/kitApi";

const KIT_CATEGORIES = [
  "Boat",
  "Paddle",
  "Spare paddle",
  "Buoyancy aid",
  "Helmet",
  "Throw line",
  "Knife",
  "First aid kit",
  "Pin kit",
  "Shelter",
  "Warm kit",
  "Food / lunch",
  "Carabiners",
  "Other",
];

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isReplaceDue(iso: string | null) {
  if (!iso) {
    return false;
  }
  const date = new Date(iso);
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
}

export function KitInventoryPanel() {
  const [items, setItems] = useState<KitItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [purchasedOn, setPurchasedOn] = useState("");
  const [replaceOn, setReplaceOn] = useState("");
  const [serial, setSerial] = useState("");

  async function load() {
    setIsLoading(true);
    setError("");
    try {
      setItems(await fetchKitItems());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load your kit.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, KitItem[]>();
    for (const item of items) {
      const existing = map.get(item.category) ?? [];
      existing.push(item);
      map.set(item.category, existing);
    }
    return [...map.entries()];
  }, [items]);

  function resetForm() {
    setCategory("");
    setName("");
    setNotes("");
    setPurchasedOn("");
    setReplaceOn("");
    setSerial("");
  }

  function closeForm() {
    resetForm();
    setEditingId(null);
    setIsFormOpen(false);
  }

  function startEdit(item: KitItem) {
    setEditingId(item.id);
    setCategory(item.category);
    setName(item.name);
    setNotes(item.notes ?? "");
    setPurchasedOn(item.purchasedOn ?? "");
    setReplaceOn(item.replaceOn ?? "");
    setSerial(item.serial ?? "");
    setIsFormOpen(true);
    setError("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!category || !name.trim()) {
      setError("Choose a category and add a name.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const draft = {
        category,
        name: name.trim(),
        notes: notes.trim() || null,
        purchasedOn: purchasedOn || null,
        replaceOn: replaceOn || null,
        serial: serial.trim() || null,
      };
      if (editingId) {
        await updateKitItem(editingId, draft);
      } else {
        await createKitItem(draft);
      }
      closeForm();
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save the kit item.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError("");
    try {
      await deleteKitItem(id);
      await load();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the kit item.",
      );
    }
  }

  return (
    <section className="kit-inventory">
      <header className="kit-inventory__header">
        <div>
          <h3>Kit</h3>
          <p className="kit-inventory__sub">
            Private to you — your gear, notes, and replacement reminders.
          </p>
        </div>
        {!isFormOpen ? (
          <button
            type="button"
            className="kit-inventory__add"
            onClick={() => setIsFormOpen(true)}
          >
            Add kit
          </button>
        ) : null}
      </header>

      {isFormOpen ? (
        <form className="kit-form" onSubmit={handleSubmit}>
          <div className="kit-form__row">
            <label className="kit-form__field">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
              >
                <option value="">— choose —</option>
                {KIT_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="kit-form__field">
              Name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Pyranha 9R II"
                required
              />
            </label>
          </div>
          <div className="kit-form__row">
            <label className="kit-form__field">
              Bought
              <input
                type="date"
                value={purchasedOn}
                onChange={(event) => setPurchasedOn(event.target.value)}
              />
            </label>
            <label className="kit-form__field">
              Replace by
              <input
                type="date"
                value={replaceOn}
                onChange={(event) => setReplaceOn(event.target.value)}
              />
            </label>
          </div>
          <label className="kit-form__field">
            Serial / marking (kept private)
            <input
              type="text"
              value={serial}
              onChange={(event) => setSerial(event.target.value)}
            />
          </label>
          <label className="kit-form__field">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
            />
          </label>
          <div className="form-actions">
            <button
              type="button"
              className="kit-inventory__add"
              onClick={closeForm}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="kit-form__submit"
              disabled={isSaving}
            >
              {isSaving
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Save kit"}
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p className="kit-inventory__error">{error}</p> : null}

      {/* While editing, focus on just the edit form — hide the full list. */}
      {editingId ? null : isLoading ? (
        <p className="kit-inventory__empty">Loading…</p>
      ) : items.length === 0 ? (
        <p className="kit-inventory__empty">
          No kit logged yet. Add your boat, paddle, and safety gear above.
        </p>
      ) : (
        <div className="kit-groups">
          {grouped.map(([groupCategory, groupItems]) => (
            <div key={groupCategory} className="kit-group">
              <h4>{groupCategory}</h4>
              <ul className="kit-item-list">
                {groupItems.map((item) => (
                  <li key={item.id} className="kit-item">
                    <div className="kit-item__main">
                      <span className="kit-item__name">{item.name}</span>
                      {isReplaceDue(item.replaceOn) ? (
                        <span className="kit-item__flag">Replace due</span>
                      ) : null}
                    </div>
                    {item.notes ? (
                      <p className="kit-item__notes">{item.notes}</p>
                    ) : null}
                    {item.purchasedOn || item.replaceOn ? (
                      <div className="kit-item__dates">
                        {item.purchasedOn ? (
                          <span>Bought {formatDate(item.purchasedOn)}</span>
                        ) : null}
                        {item.replaceOn ? (
                          <span>Replace by {formatDate(item.replaceOn)}</span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="kit-item__actions">
                      <button
                        type="button"
                        className="kit-item__edit"
                        onClick={() => startEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="kit-item__delete"
                        onClick={() => handleDelete(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
