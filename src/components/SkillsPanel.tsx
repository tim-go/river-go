import { FormEvent, useEffect, useMemo, useState } from "react";
import type { MemberSkill } from "../types";
import {
  createMemberSkill,
  deleteMemberSkill,
  fetchMemberSkills,
  updateMemberSkill,
} from "../services/skillsApi";
import { ConfirmDialog } from "./ConfirmDialog";

const SKILL_CATEGORIES = [
  "Qualification",
  "Safety & rescue",
  "First aid",
  "Leadership",
  "Experience",
  "Other",
];

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function isExpired(iso: string | null) {
  if (!iso) {
    return false;
  }
  const date = new Date(iso);
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
}

export function SkillsPanel() {
  const [skills, setSkills] = useState<MemberSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [attainedOn, setAttainedOn] = useState("");
  const [expiresOn, setExpiresOn] = useState("");

  async function load() {
    setIsLoading(true);
    setError("");
    try {
      setSkills(await fetchMemberSkills());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load your skills.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, MemberSkill[]>();
    for (const skill of skills) {
      const existing = map.get(skill.category) ?? [];
      existing.push(skill);
      map.set(skill.category, existing);
    }
    return [...map.entries()];
  }, [skills]);

  function resetForm() {
    setCategory("");
    setName("");
    setDetail("");
    setAttainedOn("");
    setExpiresOn("");
  }

  function closeForm() {
    resetForm();
    setEditingId(null);
    setIsFormOpen(false);
  }

  function startEdit(skill: MemberSkill) {
    setEditingId(skill.id);
    setCategory(skill.category);
    setName(skill.name);
    setDetail(skill.detail ?? "");
    setAttainedOn(skill.attainedOn ?? "");
    setExpiresOn(skill.expiresOn ?? "");
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
        detail: detail.trim() || null,
        attainedOn: attainedOn || null,
        expiresOn: expiresOn || null,
      };
      if (editingId) {
        await updateMemberSkill(editingId, draft);
      } else {
        await createMemberSkill(draft);
      }
      closeForm();
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save the skill.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError("");
    try {
      await deleteMemberSkill(id);
      await load();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the skill.",
      );
    }
  }

  return (
    <section className="skills-panel">
      <header className="skills-panel__header">
        <div>
          <h3>Skills &amp; qualifications</h3>
          <p className="skills-panel__sub">
            Self-declared — a personal record, not a verified certification, and
            never a claim that you are safe or suitable to lead.
          </p>
        </div>
        {!isFormOpen ? (
          <button
            type="button"
            className="skills-panel__add"
            onClick={() => setIsFormOpen(true)}
          >
            Add skill
          </button>
        ) : null}
      </header>

      {isFormOpen ? (
        <form className="skills-form" onSubmit={handleSubmit}>
          <div className="skills-form__row">
            <label className="skills-form__field">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
              >
                <option value="">— choose —</option>
                {SKILL_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="skills-form__field">
              Name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. WW Safety & Rescue (WWSR)"
                required
              />
            </label>
          </div>
          <label className="skills-form__field">
            Awarding body / detail
            <input
              type="text"
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              placeholder="e.g. Rescue 3, or '10 years paddling'"
            />
          </label>
          <div className="skills-form__row">
            <label className="skills-form__field">
              Attained
              <input
                type="date"
                value={attainedOn}
                onChange={(event) => setAttainedOn(event.target.value)}
              />
            </label>
            <label className="skills-form__field">
              Expires
              <input
                type="date"
                value={expiresOn}
                onChange={(event) => setExpiresOn(event.target.value)}
              />
            </label>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="skills-panel__add"
              onClick={closeForm}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="skills-form__submit"
              disabled={isSaving}
            >
              {isSaving
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Save skill"}
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p className="skills-panel__error">{error}</p> : null}

      {/* While editing, focus on just the edit form — hide the full list. */}
      {editingId ? null : isLoading ? (
        <p className="skills-panel__empty">Loading…</p>
      ) : skills.length === 0 ? (
        <p className="skills-panel__empty">
          No skills recorded yet. Add your qualifications, safety training, and
          experience above.
        </p>
      ) : (
        <div className="skills-groups">
          {grouped.map(([groupCategory, groupSkills]) => (
            <div key={groupCategory} className="skills-group">
              <h4>{groupCategory}</h4>
              <ul className="skill-list">
                {groupSkills.map((skill) => (
                  <li key={skill.id} className="skill-item">
                    <div className="skill-item__main">
                      <span className="skill-item__name">{skill.name}</span>
                      {isExpired(skill.expiresOn) ? (
                        <span className="skill-item__flag">Expired</span>
                      ) : null}
                    </div>
                    {skill.detail ? (
                      <p className="skill-item__detail">{skill.detail}</p>
                    ) : null}
                    {skill.attainedOn || skill.expiresOn ? (
                      <div className="skill-item__dates">
                        {skill.attainedOn ? (
                          <span>Since {formatDate(skill.attainedOn)}</span>
                        ) : null}
                        {skill.expiresOn ? (
                          <span>Expires {formatDate(skill.expiresOn)}</span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="skill-item__actions">
                      <button
                        type="button"
                        className="skill-item__edit"
                        onClick={() => startEdit(skill)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="skill-item__delete"
                        onClick={() =>
                          setConfirmDelete({ id: skill.id, label: skill.name })
                        }
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

      {confirmDelete ? (
        <ConfirmDialog
          eyebrow="Remove skill"
          title={
            confirmDelete.label
              ? `Remove “${confirmDelete.label}”?`
              : "Remove this skill?"
          }
          body={<p>This can't be undone.</p>}
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
