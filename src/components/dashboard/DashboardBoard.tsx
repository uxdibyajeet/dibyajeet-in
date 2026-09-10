"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  CASE_STUDIES_CHANGED_KEY,
  CASE_STUDIES_PENDING_KEY,
  caseStudyDocTitle,
  PendingCard as PendingCardType,
  readPendingFromStorage,
  writePendingToStorage,
  DEFAULT_META,
  type CaseStudyDoc,
  type CaseStudyStatus,
} from "@/lib/caseStudy";

const STATUSES: CaseStudyStatus[] = ["published", "archived"];
const STATUS_LABELS: Record<CaseStudyStatus, string> = {
  published: "Published",
  archived: "Saved",
};
const STATUS_EMPTY: Record<CaseStudyStatus, string> = {
  published: "Nothing published yet.",
  archived: "Nothing saved yet.",
};

type Grouped = Record<CaseStudyStatus, CaseStudyDoc[]>;
type PendingMap = Record<string, PendingCardType>;

/** Build a renderable card for a pending entry we know nothing about yet. */
function docFromPendingCard(entry: PendingCardType): CaseStudyDoc {
  return {
    schema: "case-study-v1",
    id: entry.id,
    savedAt: entry.savedAt,
    status: entry.status,
    order: entry.order,
    cover: entry.cover ?? null,
    content: {
      time: 0,
      version: "2.30.0",
      blocks: [{ type: "header", data: { level: 3, text: entry.title } }],
    },
    meta: { ...DEFAULT_META, title: entry.title },
  };
}

function mergePending(docs: CaseStudyDoc[], pending: PendingMap): CaseStudyDoc[] {
  let working = docs.slice();
  for (const entry of Object.values(pending)) {
    if (entry.kind === "delete") {
      working = working.filter((doc) => doc.id !== entry.id);
    } else {
      const index = working.findIndex((doc) => doc.id === entry.id);
      if (index === -1) {
        working.push(docFromPendingCard(entry));
      } else {
        const card = docFromPendingCard(entry);
        working[index] = {
          ...working[index],
          status: entry.status,
          order: entry.order,
          savedAt: entry.savedAt,
          cover: card.cover,
          meta: card.meta,
          content: card.content,
        };
      }
    }
  }
  return working;
}

/** Drop pending entries a fresh server read has already confirmed or that expired. */
function prunePending(server: CaseStudyDoc[], pending: PendingMap, now = Date.now()): PendingMap {
  const next: PendingMap = {};
  for (const [id, entry] of Object.entries(pending)) {
    if (now - Number(entry.at) > 45_000) continue;
    if (entry.kind === "delete") {
      if (!server.some((doc) => doc.id === id)) continue;
    } else {
      const doc = server.find((d) => d.id === id);
      if (
        doc &&
        doc.status === entry.status &&
        doc.order === entry.order &&
        doc.savedAt === entry.savedAt
      ) {
        continue;
      }
    }
    next[id] = entry;
  }
  return next;
}

function groupByStatus(docs: CaseStudyDoc[]): Grouped {
  const grouped: Grouped = { published: [], archived: [] };
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
  syncing,
  onDelete,
}: {
  doc: CaseStudyDoc;
  syncing: boolean;
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
      className={`dashboard-card${isDragging ? " is-dragging" : ""}${syncing ? " is-pending" : ""}`}
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

        {syncing ? (
          <span className="dashboard-card__pending" title="Changes are still syncing…">
            <span className="sync-spinner" aria-hidden="true" />
          </span>
        ) : null}
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
  syncing,
  onDelete,
}: {
  status: CaseStudyStatus;
  docs: CaseStudyDoc[];
  syncing: boolean;
  onDelete: (doc: CaseStudyDoc) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section className={`dashboard-section${isOver ? " is-over" : ""}`}>
      <div className="dashboard-section__header">
        <h2 className="text-headline-3">{STATUS_LABELS[status]}</h2>
        <span className="dashboard-section__header-right">
          {syncing ? (
            <span className="dashboard-section__sync" aria-live="polite">
              <span className="sync-spinner" aria-hidden="true" />
              Syncing…
            </span>
          ) : null}
          <span className="dashboard-section__count">{docs.length}</span>
        </span>
      </div>

      <div ref={setNodeRef} className="dashboard-section__rail">
        <SortableContext items={docs.map((doc) => doc.id)} strategy={rectSortingStrategy}>
          {docs.length === 0 ? (
            <p className="dashboard-section__empty">{STATUS_EMPTY[status]}</p>
          ) : (
            docs.map((doc) => (
              <ProjectCard key={doc.id} doc={doc} syncing={syncing} onDelete={onDelete} />
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

function containerFor(items: Grouped, id: string): CaseStudyStatus | null {
  for (const status of STATUSES) {
    if (items[status].some((doc) => doc.id === id)) return status;
  }
  return null;
}

export default function DashboardBoard({ initial }: { initial: CaseStudyDoc[] }) {
  const router = useRouter();
  const lastServer = useRef<CaseStudyDoc[]>(initial);
  const pendingRef = useRef<PendingMap>(readPendingFromStorage());
  const [pending, setPending] = useState<PendingMap>(pendingRef.current);
  const [items, setItems] = useState<Grouped>(() =>
    groupByStatus(mergePending(initial, pendingRef.current)),
  );
  const [prevInitial, setPrevInitial] = useState(initial);
  const [active, setActive] = useState<CaseStudyDoc | null>(null);
  const [deleting, setDeleting] = useState<CaseStudyDoc | null>(null);
  const [inFlight, setInFlight] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Persist the pending mirror so it survives full page reloads and reaches
  // other tabs (the editor writes the same key after a save).
  useEffect(() => {
    lastServer.current = initial;
  }, [initial]);

  useEffect(() => {
    writePendingToStorage(pendingRef.current);
  }, [pending]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== CASE_STUDIES_PENDING_KEY) return;
      const fromOtherTab = readPendingFromStorage();
      const merged: PendingMap = { ...pendingRef.current };
      for (const [id, entry] of Object.entries(fromOtherTab)) {
        merged[id] = entry;
      }
      pendingRef.current = merged;
      setPending(merged);
      replant();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** Re-derive the visible boards from the latest server snapshot + pending. */
  function replant() {
    setItems(groupByStatus(mergePending(lastServer.current, pendingRef.current)));
  }

  // Re-derive lists when the server sends a fresh snapshot (a save in another
  // tab triggers router.refresh(), but useState must resync with new props).
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    lastServer.current = initial;
    const pruned = prunePending(initial, pendingRef.current);
    if (pruned !== pendingRef.current) {
      pendingRef.current = pruned;
      setPending(pruned);
    }
    replant();
  }

  const markPending = (entries: PendingCardType | PendingCardType[]) => {
    const list = Array.isArray(entries) ? entries : [entries];
    const merged: PendingMap = { ...pendingRef.current };
    for (const entry of list) merged[entry.id] = entry;
    pendingRef.current = merged;
    setPending(merged);
  };

  const forgetPending = (ids: string[]) => {
    const merged: PendingMap = { ...pendingRef.current };
    for (const id of ids) delete merged[id];
    pendingRef.current = merged;
    setPending(merged);
  };

  const begin = () => setInFlight((n) => n + 1);
  const end = () => setInFlight((n) => Math.max(0, n - 1));

  const handleDelete = (doc: CaseStudyDoc) => setDeleting(doc);

  const confirmDelete = (doc: CaseStudyDoc) => {
    const key = doc.status === "archived" ? "archived" : "published";
    markPending({
      kind: "delete",
      id: doc.id,
      status: key,
      order: doc.order ?? 0,
      savedAt: doc.savedAt,
      title: caseStudyDocTitle(doc),
      cover: doc.cover,
      at: Date.now(),
    });
    setDeleting(null);
    setItems((prev) => ({
      ...prev,
      [key]: prev[key].filter((d) => d.id !== doc.id),
    }));

    begin();
    fetch(`/api/case-studies/${doc.id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error(`DELETE ${doc.id} failed (${res.status})`);
      })
      .catch((error) => {
        console.error("Delete failed:", error);
        forgetPending([doc.id]);
        replant();
      })
      .finally(end);
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

      let next: Grouped | null = null;

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
      persistOrder(next, prev, from, overStatus, begin, end, markPending, forgetPending, replant);
    },
    [items],
  );

  const pendingCount = Object.keys(pending).length;
  const syncingFor: Record<CaseStudyStatus, boolean> = {
    published: false,
    archived: false,
  };
  for (const entry of Object.values(pending)) {
    syncingFor[entry.status] = true;
  }

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 900);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <div className="dashboard-toolbar">
        <span className="dashboard-toolbar__status" aria-live="polite">
          {inFlight > 0 ? (
            <>
              <span className="sync-spinner" aria-hidden="true" />
              Updating…
            </>
          ) : pendingCount > 0 ? (
            <>
              <span className="sync-spinner" aria-hidden="true" />
              {pendingCount} change{pendingCount === 1 ? "" : "s"} still syncing…
            </>
          ) : (
            "All synced"
          )}
        </span>
        <button
          type="button"
          className="btn secondary-btn dashboard-refresh"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="dashboard-board">
        {STATUSES.map((status) => (
          <SectionRail
            key={status}
            status={status}
            docs={items[status]}
            syncing={syncingFor[status] || inFlight > 0}
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
  next: Grouped,
  prev: Grouped,
  from: CaseStudyStatus,
  to: CaseStudyStatus,
  begin: () => void,
  end: () => void,
  markPending: (entries: PendingCardType[] | PendingCardType) => void,
  forgetPending: (ids: string[]) => void,
  replant: () => void,
): void {
  const changed = new Set([from, to]);
  const updates: { id: string; status: CaseStudyStatus; order: number }[] = [];
  const pendingEntries: PendingCardType[] = [];
  const at = Date.now();

  for (const status of changed) {
    if (next[status].map((d) => d.id).join() === prev[status].map((d) => d.id).join()) {
      continue;
    }
    for (const [index, doc] of next[status].entries()) {
      updates.push({ id: doc.id, status, order: index });
      pendingEntries.push({
        kind: "set",
        id: doc.id,
        status,
        order: index,
        savedAt: doc.savedAt,
        title: caseStudyDocTitle(doc),
        cover: doc.cover,
        at,
      });
    }
  }
  if (updates.length === 0) return;

  const affectedIds = updates.map((u) => u.id);
  markPending(pendingEntries);

  begin();
  fetch("/api/case-studies", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Reorder failed (${res.status})`);
      if (typeof window !== "undefined") {
        localStorage.setItem(CASE_STUDIES_CHANGED_KEY, Date.now().toString());
      }
    })
    .catch((error) => {
      console.error("Reorder failed:", error);
      forgetPending(affectedIds);
      replant();
    })
    .finally(end);
}