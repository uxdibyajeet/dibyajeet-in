import {
  type CaseStudyDoc,
  type CaseStudyStatus,
  DEFAULT_META,
} from "./caseStudy";
import { type Json, deleteKey, listKeys, readJson, writeJson } from "./storage";

const INDEX_KEY = "case-studies/index.json";

function keyFor(slug: string): string | null {
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return null;
  return `case-studies/${slug}.json`;
}

function normalize(doc: Partial<CaseStudyDoc> | null): CaseStudyDoc | null {
  if (!doc || typeof doc !== "object" || doc.schema !== "case-study-v1") return null;
  return {
    ...(doc as CaseStudyDoc),
    status: doc.status === "archived" ? "archived" : "published",
    meta: {
      ...DEFAULT_META,
      ...(doc.meta ?? {}),
      duration: {
        ...DEFAULT_META.duration,
        ...(doc.meta?.duration ?? {}),
      },
    },
  };
}

/* ---------- index (keeps the dashboard list at one blob read) ---------- */

async function readIndex(): Promise<Json[]> {
  const index = await readJson(INDEX_KEY);
  return index && Array.isArray(index.docs) ? (index.docs as Json[]) : [];
}

async function updateIndex(slug: string, doc: Json | null): Promise<void> {
  const docs = await readIndex();
  const existing = docs.findIndex((entry) => entry.id === slug);
  if (doc) {
    if (existing >= 0) docs[existing] = doc;
    else docs.push(doc);
  } else if (existing >= 0) {
    docs.splice(existing, 1);
  }
  await writeJson(INDEX_KEY, { version: 1, docs });
}

/* ---------- case-study operations ---------- */

export async function writeCaseStudy(slug: string, doc: CaseStudyDoc): Promise<void> {
  const key = keyFor(slug);
  if (!key) throw new Error("Invalid case study slug");
  await writeJson(key, doc as unknown as Json);
  await updateIndex(slug, doc as unknown as Json);
}

export async function readCaseStudy(slug: string): Promise<CaseStudyDoc | null> {
  const key = keyFor(slug);
  if (!key) return null;
  const raw = await readJson(key);
  return normalize(raw as Partial<CaseStudyDoc> | null);
}

export async function listCaseStudies(): Promise<CaseStudyDoc[]> {
  // Authoritative read: the store is the source of truth, not the index.
  // Each document blob is written atomically by a single PUT, so status/order
  // are always current — unlike the index, whose read-modify-write could race
  // and serve a stale status after a drag-publish.
  const result: CaseStudyDoc[] = [];
  const keys = await listKeys("case-studies/");
  for (const key of keys) {
    const name = key.replace(/^case-studies\//, "");
    if (name === "index.json" || !name.endsWith(".json")) continue;
    const raw = await readJson(key);
    const normalized = normalize(raw as Partial<CaseStudyDoc> | null);
    if (normalized) result.push(normalized);
  }

  return result.sort(
    (a, b) =>
      (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
      b.savedAt.localeCompare(a.savedAt),
  );
}

export interface CaseStudyPatch {
  status?: CaseStudyStatus;
  order?: number;
}

export async function patchCaseStudy(
  slug: string,
  patch: CaseStudyPatch,
): Promise<CaseStudyDoc | null> {
  const doc = await readCaseStudy(slug);
  if (!doc || doc.id !== slug) return null;

  if (patch.status) doc.status = patch.status;
  if (typeof patch.order === "number") doc.order = patch.order;
  await writeCaseStudy(slug, doc);
  return doc;
}

export async function deleteCaseStudy(slug: string): Promise<boolean> {
  const key = keyFor(slug);
  if (!key) return false;

  // Idempotent delete: even if the blob is already missing (orphaned/ghost
  // cards), still drop the index entry and report success so the dashboard
  // can always dismiss the card.
  await deleteKey(key);
  await updateIndex(slug, null);
  return true;
}

export async function createCaseStudy(): Promise<CaseStudyDoc> {
  let slug: string;
  do {
    const stamp = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 6);
    slug = `proj-${stamp}-${rand}`;
  } while (await readCaseStudy(slug));

  const doc: CaseStudyDoc = {
    schema: "case-study-v1",
    id: slug,
    savedAt: new Date().toISOString(),
    status: "archived",
    order: 0,
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
  };

  await writeCaseStudy(slug, doc);
  return doc;
}