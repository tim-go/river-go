import { FormEvent, useEffect, useState } from "react";
import type { PaddleLog, PaddleStats } from "../types";
import {
  createPaddleLog,
  deletePaddleLog,
  fetchPaddleLogs,
  fetchPaddleStats,
  updatePaddleLog,
} from "../services/paddleLogApi";
import { ConfirmDialog } from "./ConfirmDialog";

interface RiverOption {
  id: string;
  displayName: string;
}

interface PaddleHistoryPanelProps {
  rivers: RiverOption[];
}

const CRAFT_TYPES = ["Kayak", "Canoe", "SUP", "Raft", "Other"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

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

export function PaddleHistoryPanel({ rivers }: PaddleHistoryPanelProps) {
  const [logs, setLogs] = useState<PaddleLog[]>([]);
  const [stats, setStats] = useState<PaddleStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const [riverId, setRiverId] = useState("");
  const [title, setTitle] = useState("");
  const [paddledOn, setPaddledOn] = useState(todayIso());
  const [levelNote, setLevelNote] = useState("");
  const [craftType, setCraftType] = useState("");
  const [companions, setCompanions] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    setIsLoading(true);
    setError("");
    try {
      const [loadedLogs, loadedStats] = await Promise.all([
        fetchPaddleLogs(),
        fetchPaddleStats(),
      ]);
      setLogs(loadedLogs);
      setStats(loadedStats);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load your paddle history.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setRiverId("");
    setTitle("");
    setPaddledOn(todayIso());
    setLevelNote("");
    setCraftType("");
    setCompanions("");
    setNotes("");
  }

  function closeForm() {
    resetForm();
    setEditingId(null);
    setIsFormOpen(false);
  }

  function startEdit(log: PaddleLog) {
    setEditingId(log.id);
    setRiverId(log.riverId ?? "");
    setTitle(log.title);
    setPaddledOn(log.paddledOn);
    setLevelNote(log.levelNote ?? "");
    setCraftType(log.craftType ?? "");
    setCompanions(log.companions ?? "");
    setNotes(log.notes ?? "");
    setIsFormOpen(true);
    setError("");
  }

  function handleRiverChange(value: string) {
    setRiverId(value);
    const river = rivers.find((item) => item.id === value);
    if (river) {
      setTitle(river.displayName);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const resolvedTitle =
      title.trim() ||
      rivers.find((river) => river.id === riverId)?.displayName ||
      "";

    if (!resolvedTitle) {
      setError("Add a river or venue name.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const draft = {
        riverId: riverId || null,
        title: resolvedTitle,
        paddledOn,
        levelNote: levelNote.trim() || null,
        craftType: craftType || null,
        companions: companions.trim() || null,
        notes: notes.trim() || null,
      };
      if (editingId) {
        await updatePaddleLog(editingId, draft);
      } else {
        await createPaddleLog(draft);
      }
      closeForm();
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save the paddle.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError("");
    try {
      await deletePaddleLog(id);
      await load();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the paddle.",
      );
    }
  }

  return (
    <section className="paddle-history">
      <header className="paddle-history__header">
        <div>
          <h3>Paddle history</h3>
          <p className="paddle-history__sub">
            Private to you — a log of the rivers you have paddled.
          </p>
        </div>
        {!isFormOpen ? (
          <button
            type="button"
            className="paddle-history__add"
            onClick={() => setIsFormOpen(true)}
          >
            Log a paddle
          </button>
        ) : null}
      </header>

      {stats && stats.totalPaddles > 0 ? (
        <div className="paddle-stats">
          <div className="paddle-stat">
            <strong>{stats.totalPaddles}</strong>
            <span>paddles</span>
          </div>
          <div className="paddle-stat">
            <strong>{stats.distinctRivers}</strong>
            <span>rivers</span>
          </div>
          <div className="paddle-stat">
            <strong>{stats.thisYearPaddles}</strong>
            <span>this year</span>
          </div>
          <div className="paddle-stat">
            <strong>{stats.thisYearNewRivers}</strong>
            <span>new this year</span>
          </div>
          {stats.mostPaddled ? (
            <div className="paddle-stat paddle-stat--wide">
              <strong>{stats.mostPaddled.title}</strong>
              <span>most paddled ({stats.mostPaddled.count})</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {isFormOpen ? (
        <form className="paddle-form" onSubmit={handleSubmit}>
          <label className="paddle-form__field">
            River
            <select
              value={riverId}
              onChange={(event) => handleRiverChange(event.target.value)}
            >
              <option value="">— choose a river —</option>
              {rivers.map((river) => (
                <option key={river.id} value={river.id}>
                  {river.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="paddle-form__field">
            Or name a venue / river
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Cardiff International White Water"
            />
          </label>
          <div className="paddle-form__row">
            <label className="paddle-form__field">
              Date
              <input
                type="date"
                value={paddledOn}
                max={todayIso()}
                onChange={(event) => setPaddledOn(event.target.value)}
                required
              />
            </label>
            <label className="paddle-form__field">
              Craft
              <select
                value={craftType}
                onChange={(event) => setCraftType(event.target.value)}
              >
                <option value="">—</option>
                {CRAFT_TYPES.map((craft) => (
                  <option key={craft} value={craft}>
                    {craft}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="paddle-form__field">
            Level / release at the time
            <input
              type="text"
              value={levelNote}
              onChange={(event) => setLevelNote(event.target.value)}
              placeholder="e.g. 0.6m and rising"
            />
          </label>
          <label className="paddle-form__field">
            Paddled with
            <input
              type="text"
              value={companions}
              onChange={(event) => setCompanions(event.target.value)}
              placeholder="partners or group"
            />
          </label>
          <label className="paddle-form__field">
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
              className="paddle-history__add"
              onClick={closeForm}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="paddle-form__submit"
              disabled={isSaving}
            >
              {isSaving
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Save paddle"}
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p className="paddle-history__error">{error}</p> : null}

      {/* While editing, focus on just the edit form — hide the full list. */}
      {editingId ? null : isLoading ? (
        <p className="paddle-history__empty">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="paddle-history__empty">
          No paddles logged yet. Log your first one above.
        </p>
      ) : (
        <ul className="paddle-log-list">
          {logs.map((log) => (
            <li key={log.id} className="paddle-log">
              <div className="paddle-log__main">
                <span className="paddle-log__title">{log.title}</span>
                <span className="paddle-log__date">
                  {formatDate(log.paddledOn)}
                </span>
              </div>
              {log.craftType || log.levelNote || log.companions ? (
                <div className="paddle-log__meta">
                  {log.craftType ? <span>{log.craftType}</span> : null}
                  {log.levelNote ? <span>{log.levelNote}</span> : null}
                  {log.companions ? <span>with {log.companions}</span> : null}
                </div>
              ) : null}
              {log.notes ? (
                <p className="paddle-log__notes">{log.notes}</p>
              ) : null}
              <div className="paddle-log__actions">
                <button
                  type="button"
                  className="paddle-log__edit"
                  onClick={() => startEdit(log)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="paddle-log__delete"
                  onClick={() =>
                    setConfirmDelete({ id: log.id, label: log.title })
                  }
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {confirmDelete ? (
        <ConfirmDialog
          eyebrow="Remove paddle"
          title={
            confirmDelete.label
              ? `Remove “${confirmDelete.label}”?`
              : "Remove this paddle?"
          }
          body={<p>This removes it from your paddle history.</p>}
          confirmLabel="Remove"
          onConfirm={() => {
            void handleDelete(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : null}
    </section>
  );
}
