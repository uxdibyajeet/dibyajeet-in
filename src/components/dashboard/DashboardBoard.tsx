"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { caseStudyDocTitle, CASE_STUDIES_CHANGED_KEY, type CaseStudyDoc, type CaseStudyStatus } from "@/lib/caseStudy";

const STATUSES: CaseStudyStatus[] = ["published", "archived"];
const STATUS_LABELS: Record<CaseStudyStatus, string> = {
  published: "Published",
  archived: "Saved",
};
const STATUS_EMPTY: Record<CaseStudyStatus, string> = {
  published: "Nothing published yet.",
  archived: "Nothing saved yet.",
};

function groupByStatus(docs: CaseStudyDoc[]): Record<CaseStudyStatus, CaseStudyDoc[]> {
  const grouped: Record<CaseStudyStatus, CaseStudyDoc[]> = {
    published: [],
    archived: [],
  };
  for (const doc of docs) {
    const key = doc.status === "archived" ? "archived" : "published";
    grouped[key].push(doc);
  }
  for (const status of STATUSES) {
    grouped[status].sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
        b.savedAt.localeCompare(a.savedAt),
    );
  }
  return grouped;
}

const isStatus = (id: unknown): id is CaseStudyStatus =>
  id === "published" || id === "archived";

function ProjectCard({
  doc,
  onDelete,
}: {
  doc: CaseStudyDoc;
  onDelete: (doc: CaseStudyDoc) => void;
}) {
  const title = useMemo(() => caseStudyDocTitle(doc), [doc]);
  const date = useMemo(
    () =>
      new Date(doc.savedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [doc.savedAt],
  );

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: doc.id });

  return (
    <Link
      ref={setNodeRef}
      href={`/pageEditor/${doc.id}`}
      data-link=""
      className={`dashboard-card${isDragging ? " is-dragging" : ""}`}
      suppressHydrationWarning
      onClick={(e) => {
        e.preventDefault();
        window.open(`/pageEditor/${doc.id}`, "_blank");
      }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: "none",
      }}
      {...attributes}
      {...listeners}
    >
      <span className="dashboard-card__cover-wrap">
        {doc.cover?.dataUrl ? (
          <span
            className="dashboard-card__cover"
            style={{
              backgroundImage: `url("${doc.cover.dataUrl}")`,
              backgroundPosition: `${doc.cover.position.x}% ${doc.cover.position.y}%`,
            }}
            aria-hidden="true"
          />
        ) : (
          <span className="dashboard-card__cover dashboard-card__cover--empty" aria-hidden="true">
            <i className="bi bi-image" />
          </span>
        )}

        <button
          type="button"
          className="dashboard-card__delete"
          aria-label={`Delete ${title}`}
          title="Delete project"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(doc);
          }}
        >
          <i className="bi bi-trash" aria-hidden="true" />
        </button>
      </span>

      <span className="dashboard-card__body">
        <span className="dashboard-card__title">{title}</span>
        <span className="dashboard-card__meta">
          {date} <i className="bi bi-grip-vertical" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}

function SectionRail({
  status,
  docs,
  onDelete,
}: {
  status: CaseStudyStatus;
  docs: CaseStudyDoc[];
  onDelete: (doc: CaseStudyDoc) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section className={`dashboard-section${isOver ? " is-over" : ""}`}>
      <div className="dashboard-section__header">
        <h2 className="text-headline-3">{STATUS_LABELS[status]}</h2>
        <span className="dashboard-section__count">{docs.length}</span>
      </div>

      <div ref={setNodeRef} className="dashboard-section__rail">
        <SortableContext items={docs.map((doc) => doc.id)} strategy={rectSortingStrategy}>
          {docs.length === 0 ? (
            <p className="dashboard-section__empty">{STATUS_EMPTY[status]}</p>
          ) : (
            docs.map((doc) => (
              <ProjectCard key={doc.id} doc={doc} onDelete={onDelete} />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}

function DeleteModal({
  doc,
  onCancel,
  onConfirm,
}: {
  doc: CaseStudyDoc;
  onCancel: () => void;
  onConfirm: (doc: CaseStudyDoc) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="delete-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="delete-modal__box">
        <h3 id="delete-modal-title" className="text-headline-3">
          Delete this project?
        </h3>
        <p className="delete-modal__text">
          “{caseStudyDocTitle(doc)}” will be permanently removed. This action
          cannot be undone.
        </p>
        <div className="delete-modal__actions">
          <button type="button" className="btn secondary-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary-btn"
            data-danger=""
            onClick={() => onConfirm(doc)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function containerFor(items: Record<CaseStudyStatus, CaseStudyDoc[]>, id: string): CaseStudyStatus | null {
  for (const status of STATUSES) {
    if (items[status].some((doc) => doc.id === id)) return status;
  }
  return null;
}

export default function DashboardBoard({ initial }: { initial: CaseStudyDoc[] }) {
  const [items, setItems] = useState<Record<CaseStudyStatus, CaseStudyDoc[]>>(() =>
    groupByStatus(initial),
  );
  const [prevInitial, setPrevInitial] = useState(initial);
  const [active, setActive] = useState<CaseStudyDoc | null>(null);
  const [deleting, setDeleting] = useState<CaseStudyDoc | null>(null);

  // Re-derive lists when the server sends a fresh snapshot (a save in another
  // tab triggers router.refresh(), but useState must resync with the new props).
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setItems(groupByStatus(initial));
  }

  const handleDelete = (doc: CaseStudyDoc) => setDeleting(doc);

  const confirmDelete = (doc: CaseStudyDoc) => {
    const key = doc.status === "archived" ? "archived" : "published";
    fetch(`/api/case-studies/${doc.id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error(`DELETE ${doc.id} failed (${res.status})`);
        setItems((prev) => ({
          ...prev,
          [key]: prev[key].filter((d) => d.id !== doc.id),
        }));
      })
      .catch((error) => console.error("Delete failed:", error))
      .finally(() => setDeleting(null));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    for (const status of STATUSES) {
      const found = items[status].find((doc) => doc.id === id);
      if (found) {
        setActive(found);
        break;
      }
    }
  }, [items]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active: dragged, over } = event;
      setActive(null);
      if (!over) return;

      const activeId = String(dragged.id);
      const overId = String(over.id);
      const from = containerFor(items, activeId);
      if (!from) return;

      const overStatus = isStatus(overId) ? overId : containerFor(items, overId);
      if (!overStatus) return;

      let next: Record<CaseStudyStatus, CaseStudyDoc[]> | null = null;

      if (from === overStatus) {
        const list = [...items[from]];
        const oldIndex = list.findIndex((doc) => doc.id === activeId);
        if (oldIndex === -1) return;
        const targetIndex =
          overId === from ? list.length : list.findIndex((doc) => doc.id === overId);
        const insertIndex = targetIndex === -1 ? list.length : targetIndex;
        const [moved] = list.splice(oldIndex, 1);
        list.splice(insertIndex, 0, moved);
        next = { ...items, [from]: list };
      } else {
        const moved = items[from].find((doc) => doc.id === activeId);
        if (!moved) return;
        const source = items[from].filter((doc) => doc.id !== activeId);
        const target = [...items[overStatus]];
        const targetIndex =
          overId === overStatus
            ? target.length
            : target.findIndex((doc) => doc.id === overId);
        target.splice(targetIndex === -1 ? target.length : targetIndex, 0, moved);
        next = { ...items, [from]: source, [overStatus]: target };
      }

      const prev = items;
      setItems(next);
      persistOrder(next, prev, from, overStatus, setItems);
    },
    [items],
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <div className="dashboard-board">
        {STATUSES.map((status) => (
          <SectionRail
            key={status}
            status={status}
            docs={items[status]}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <DragOverlay>
        {active ? (
          <div className="dashboard-card dashboard-card--overlay">
            {active.cover?.dataUrl ? (
              <span
                className="dashboard-card__cover"
                style={{ backgroundImage: `url("${active.cover.dataUrl}")` }}
                aria-hidden="true"
              />
            ) : (
              <span className="dashboard-card__cover dashboard-card__cover--empty" aria-hidden="true">
                <i className="bi bi-image" />
              </span>
            )}
            <span className="dashboard-card__body">
              <span className="dashboard-card__title">{caseStudyDocTitle(active)}</span>
            </span>
          </div>
        ) : null}
      </DragOverlay>

      {deleting ? (
        <DeleteModal doc={deleting} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
      ) : null}
    </DndContext>
  );
}

function persistOrder(
  next: Record<CaseStudyStatus, CaseStudyDoc[]>,
  prev: Record<CaseStudyStatus, CaseStudyDoc[]>,
  from: CaseStudyStatus,
  to: CaseStudyStatus,
  setItems: Dispatch<SetStateAction<Record<CaseStudyStatus, CaseStudyDoc[]>>>,
): void {
  const changed = new Set([from, to]);
  const updates = [];
  for (const status of changed) {
    if (next[status].map((d) => d.id).join() === prev[status].map((d) => d.id).join()) {
      continue;
    }
    for (const [index, doc] of next[status].entries()) {
      updates.push({ id: doc.id, status, order: index });
    }
  }
  if (updates.length === 0) return;

  fetch("/api/case-studies", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates }),
  }).then((res) => {
    if (!res.ok) throw new Error(`Reorder failed (${res.status})`);
    localStorage.setItem(CASE_STUDIES_CHANGED_KEY, Date.now().toString());
  }).catch((error) => {
    console.error("Reorder failed:", error);
    setItems(prev);
  });
}