import {
  type CaseStudyDoc,
  type CaseStudyStatus,
  DEFAULT_META,
} from "./caseStudy";
import { kvAvailable, readIndex, removeDoc, setIndex, upsertDoc } from "./kvIndex";
import { type Json, deleteKey, listKeys, readJson, writeJson } from "./storage";

/**
 * Case-study persistence.
 *
 * One document == one blob at `case-studies/<slug>.json`. There is no shared
 * index to read-modify-write, so concurrent updates cannot lose data: every
 * write overwrites exactly one document key atomically.
 *
 * When an Upstash Redis instance is configured, the full documents are also
 * mirrored in Redis under `portfolio:cs:docs` so list/single reads are
 * strongly-consistent and instant instead of waiting out Blob's
 * eventual-consistency after each overwrite. Blob is always written first and
 * stays the durable source of truth; Redis is repaired/seeded on every list
 * that finds it missing or stale.
 */

function keyFor(slug: string): string | null {
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return null;
  return `case-studies/${slug}.json`;
}

function normalize(raw: Partial<CaseStudyDoc> | null): CaseStudyDoc | null {
  if (!raw || typeof raw !== "object" || raw.schema !== "case-study-v1") {
    return null;
  }
  const id = typeof raw.id === "string" ? raw.id : "";
  if (!id) return null;
  return {
    id,
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : new Date().toISOString(),
    schema: "case-study-v1",
    status: raw.status === "published" ? "published" : "archived",
    order: typeof raw.order === "number" ? raw.order : undefined,
    cover: raw.cover ?? null,
    content: raw.content ?? { time: Date.now(), version: "2.30.0", blocks: [] },
    meta: {
      ...DEFAULT_META,
      ...(raw.meta ?? {}),
      duration: {
        ...DEFAULT_META.duration,
        ...(raw.meta?.duration ?? {}),
      },
    },
  };
}

async function readRaw(slug: string): Promise<CaseStudyDoc | null> {
  const key = keyFor(slug);
  if (!key) return null;
  const raw = await readJson(key);
  return normalize(raw as Partial<CaseStudyDoc> | null);
}

/** Full Blob-backed listing (used as the KV fallback/repair source). */
async function listAllFromBlob(): Promise<CaseStudyDoc[]> {
  const keys = await listKeys("case-studies/");
  const docs: CaseStudyDoc[] = [];
  for (const key of keys) {
    const name = key.replace(/^case-studies\//, "");
    if (!name.endsWith(".json") || name === "index.json") continue;
    const normalized = normalize((await readJson(key)) as Partial<CaseStudyDoc> | null);
    if (normalized) docs.push(normalized);
  }
  return docs.sort(byOrder);
}

/** Live count of document blobs (cheap cross-check against the KV index). */
async function blobDocCount(): Promise<number> {
  const keys = await listKeys("case-studies/");
  let count = 0;
  for (const key of keys) {
    const name = key.replace(/^case-studies\//, "");
    if (name.endsWith(".json") && name !== "index.json") count += 1;
  }
  return count;
}

/**
 * Sorted-by-display-order listing of every document.
 *
 * Reads from the KV mirror when healthy (instant, strongly consistent) and
 * falls back to per-blob reads when KV is missing or out of sync, repairing
 * the mirror on the way out.
 */
export async function listCaseStudies(): Promise<CaseStudyDoc[]> {
  if (kvAvailable) {
    const index = await readIndex();
    if (index) {
      const cached = Object.values(index)
        .map((raw) => normalize(raw as Partial<CaseStudyDoc> | null))
        .filter((doc): doc is CaseStudyDoc => Boolean(doc));
      if (cached.length > 0 && (await blobDocCount()) === cached.length) {
        return cached.sort(byOrder);
      }
    }
  }

  const docs = await listAllFromBlob();
  if (kvAvailable) {
    await setIndex(Object.fromEntries(docs.map((doc) => [doc.id, doc])));
  }
  return docs;
}

function byOrder(a: CaseStudyDoc, b: CaseStudyDoc): number {
  const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
  return aOrder - bOrder || b.savedAt.localeCompare(a.savedAt);
}

export async function readCaseStudy(slug: string): Promise<CaseStudyDoc | null> {
  if (kvAvailable) {
    const index = await readIndex();
    const cached = index?.[slug];
    if (cached) {
      const normalized = normalize(cached as Partial<CaseStudyDoc> | null);
      if (normalized) return normalized;
    }
  }
  return readRaw(slug);
}

/**
 * Overwrite a document, preserving fields the writer usually does not own
 * (status, order) unless the incoming doc explicitly changes them.
 */
export async function saveCaseStudy(
  slug: string,
  incoming: Partial<CaseStudyDoc>,
): Promise<CaseStudyDoc> {
  const key = keyFor(slug);
  if (!key) throw new Error("Invalid case study slug");

  const existing = await readRaw(slug);
  const doc = normalize({
    ...incoming,
    id: existing?.id ?? slug,
    savedAt: existing?.savedAt ?? incoming.savedAt,
    status: incoming.status ?? existing?.status ?? "archived",
    order:
      incoming.order === undefined || incoming.order === null
        ? existing?.order
        : incoming.order,
  });
  if (!doc) throw new Error("Invalid case study document");

  await writeJson(key, doc as unknown as Json);
  if (kvAvailable) await upsertDoc(doc);
  return doc;
}

export interface StatusOrderUpdate {
  id: string;
  status: CaseStudyStatus;
  order: number;
}

/**
 * Apply a dashboard drag/reorder transaction. Writes are sequential so a single
 * reorder is one "commit" from a single client, and each write touches only its
 * own document key (no shared state to race on across requests).
 */
export async function applyStatusOrder(
  updates: StatusOrderUpdate[],
): Promise<CaseStudyDoc[]> {
  const saved: CaseStudyDoc[] = [];
  for (const update of updates) {
    const existing = await readRaw(update.id);
    if (!existing) continue;
    const doc = await saveCaseStudy(update.id, {
      ...existing,
      status: update.status,
      order: update.order,
    });
    saved.push(doc);
  }
  return saved;
}

/** Idempotent delete: a missing blob is still a success. */
export async function deleteCaseStudy(slug: string): Promise<boolean> {
  const key = keyFor(slug);
  if (!key) return false;
  const ok = await deleteKey(key);
  if (ok && kvAvailable) await removeDoc(slug);
  return ok;
}

export async function createCaseStudy(): Promise<CaseStudyDoc> {
  const existing = await listCaseStudies();
  const nextOrder =
    existing.length === 0
      ? 0
      : Math.max(...existing.map((doc) => doc.order ?? 0)) + 1;

  let slug: string;
  do {
    const stamp = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 6);
    slug = `proj-${stamp}-${rand}`;
  } while (await readRaw(slug));

  const doc = normalize({
    schema: "case-study-v1",
    id: slug,
    savedAt: new Date().toISOString(),
    status: "archived",
    order: nextOrder,
    cover: null,
    content: {
      time: Date.now(),
      version: "2.30.0",
      blocks: [
        { type: "header", data: { level: 2, text: "Untitled" } },
        { type: "paragraph", data: { text: "" } },
      ],
    },
    meta: { ...DEFAULT_META },
  }) as CaseStudyDoc;

  await writeJson(keyFor(slug) as string, doc as unknown as Json);
  if (kvAvailable) await upsertDoc(doc);
  return doc;
}