"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  broadcastCaseStudyChange,
  buildCaseStudyDoc,
  caseStudyDescription,
  caseStudyDocTitle,
  type CaseStudyDoc,
  type CaseStudyStatus,
  type PendingCard,
} from "@/lib/caseStudy";
import { STEP_CASE_STUDY, setStep } from "@/lib/stepperStore";

const DESCRIPTION_MAX = 200;

interface ModalToast {
  kind: "success" | "error";
  message: string;
}

export default function CardEditorModal({ slug }: { slug: string }) {
  const router = useRouter();
  const [doc, setDoc] = useState<CaseStudyDoc | null>(null);
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("");
  const [projectType, setProjectType] = useState<string[]>([]);
  const [projectTypeInput, setProjectTypeInput] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ModalToast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/case-studies/${slug}`);
        if (!res.ok) return;
        const data = (await res.json()) as CaseStudyDoc;
        if (cancelled) return;
        setDoc(data);
        setTitle(data.meta?.title ?? "");
        setRole(data.meta?.role ?? "");
        setProjectType(data.meta?.projectType ?? []);
        setDescription(data.meta?.projectDescription ?? "");
      } catch {
        /* fetch failed — form stays empty */
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const addProjectType = () => {
    const value = projectTypeInput.trim();
    if (value && !projectType.includes(value)) {
      setProjectType([...projectType, value]);
    }
    setProjectTypeInput("");
  };

  const handleProjectTypeKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addProjectType();
    } else if (e.key === "Backspace" && projectTypeInput === "" && projectType.length > 0) {
      setProjectType(projectType.slice(0, -1));
    }
  };

  const persist = async (status: CaseStudyStatus): Promise<boolean> => {
    if (busy || !doc) return false;
    setBusy(true);
    try {
      const built = await buildCaseStudyDoc(slug, status);
      const payload = {
        ...built,
        meta: {
          ...built.meta,
          title,
          role,
          projectType,
          projectDescription: description.trim(),
        },
      };
      const res = await fetch(`/api/case-studies/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save card");
      const saved = (await res.json()) as CaseStudyDoc;
      setDoc(saved);
      const entry: PendingCard = {
        kind: "set",
        id: slug,
        status: saved.status,
        order: typeof saved.order === "number" ? saved.order : 0,
        savedAt: saved.savedAt,
        title: caseStudyDocTitle(saved),
        cover: saved.cover,
        at: Date.now(),
      };
      broadcastCaseStudyChange(entry);
      return true;
    } catch (error) {
      console.error("Card save failed:", error);
      setToast({ kind: "error", message: "Save failed — try again" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    const ok = await persist(doc?.status ?? "archived");
    if (ok) setToast({ kind: "success", message: "Saved" });
  };

  const handlePublish = async () => {
    if (busy) return;
    const ok = await persist("published");
    if (ok) {
      setToast({ kind: "success", message: "Published" });
      setBusy(true);
      window.setTimeout(() => router.push("/dashboard"), 900);
    }
  };

  const previewCover = doc?.cover?.dataUrl ?? null;
  const previewPosition = doc?.cover?.position ?? { x: 50, y: 50 };
  const readingTime = doc?.meta?.readingTime ?? 1;
  const fallbackDesc = doc ? caseStudyDescription(doc) : "";
  const previewDesc = description.trim() || fallbackDesc;

  return (
    <div className="card-modal-overlay" role="presentation">
      <div className="card-modal" role="dialog" aria-modal="true" aria-label="Card editor">
        <div className="card-modal__head">
          <div>
            <h3 className="text-headline-2 card-modal__title">Card details</h3>
            <span className="text-caption card-modal__hint">
              This is what visitors see on your project card.
            </span>
          </div>
          <button
            type="button"
            className="btn secondary-btn card-modal__close"
            onClick={() => setStep(STEP_CASE_STUDY)}
            aria-label="Back to page editor"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="card-modal__body">
          <div className="card-preview">
            <div className="card-preview__shell">
              <span className="card-preview__frame project-card">
                {previewCover ? (
                  <span
                    className="project-card__cover"
                    style={{
                      backgroundImage: `url("${previewCover}")`,
                      backgroundPosition: `${previewPosition.x}% ${previewPosition.y}%`,
                    }}
                    aria-hidden="true"
                  />
                ) : (
                  <span className="project-card__cover project-card__cover--empty" aria-hidden="true">
                    <i className="bi bi-image" />
                  </span>
                )}
                <span className="project-card__body">
                  <span className="project-card__reading text-caption">
                    <i className="bi bi-clock" aria-hidden="true" />
                    ~{readingTime} min read
                  </span>
                  <h3 className="project-card__title text-headline-2">
                    {title.trim() || "Untitled"}
                  </h3>
                  {previewDesc ? (
                    <p className="project-card__desc text-base">{previewDesc}</p>
                  ) : null}
                  {projectType.length > 0 ? (
                    <span className="project-card__tags">
                      {projectType.map((type) => (
                        <span key={type} className="project-card__tag text-caption">
                          {type}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
              </span>
            </div>
          </div>

          <form
            className="card-form"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <label className="meta-field">
              <span className="meta-field__label">Project title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled project"
              />
            </label>

            <label className="meta-field">
              <span className="meta-field__label">My role</span>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Product Designer"
              />
            </label>

            <div className="meta-field">
              <span className="meta-field__label">Project type</span>
              <div className="meta-tools">
                <input
                  type="text"
                  value={projectTypeInput}
                  onChange={(e) => setProjectTypeInput(e.target.value)}
                  onKeyDown={handleProjectTypeKey}
                  placeholder="Add a type and press Enter"
                />
                {projectType.length > 0 ? (
                  <ul className="meta-tools__list">
                    {projectType.map((type) => (
                      <li key={type} className="meta-tools__chip">
                        <span>{type}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${type}`}
                          onClick={() =>
                            setProjectType(projectType.filter((t) => t !== type))
                          }
                        >
                          <i className="bi bi-x" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            <label className="meta-field">
              <span className="meta-field__label">Project description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                placeholder="A short pitch shown on the card…"
                rows={4}
                maxLength={DESCRIPTION_MAX}
              />
              <span className="card-form__count text-caption">
                {description.length}/{DESCRIPTION_MAX} characters
              </span>
            </label>
          </form>
        </div>

        <div className="card-modal__foot">
          {doc ? <span className="text-caption card-modal__status">Status: {doc.status}</span> : null}
          <div className="btn-group">
            <button
              type="button"
              className="btn secondary-btn"
              onClick={handleSave}
              disabled={busy}
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="btn primary-btn"
              onClick={handlePublish}
              disabled={busy}
            >
              {busy ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>

        {toast ? (
          <div className={`editor-toast editor-toast--${toast.kind}`} role="status" aria-live="polite">
            <i
              className={`bi ${toast.kind === "success" ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"}`}
              aria-hidden="true"
            />
            <span>{toast.message}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}