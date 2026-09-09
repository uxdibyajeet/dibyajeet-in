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
  const docs = await readIndex();

  // Self-heal the index: reconcile it against the real keys in the store so
  // projects written by other means (scripts, migration, manual writes) always
  // show up, and index entries whose document no longer exists are dropped.
  const known = new Map<string, Json>();
  for (const doc of docs) {
    if (typeof doc.id === "string") known.set(doc.id, doc);
  }

  const keySlugs = new Set<string>();
  const keys = await listKeys("case-studies/");
  for (const key of keys) {
    const name = key.replace(/^case-studies\//, "");
    if (name === "index.json" || !name.endsWith(".json")) continue;
    keySlugs.add(name.slice(0, -5));
  }

  let changed = false;
  for (const slug of known.keys()) {
    if (!keySlugs.has(slug)) {
      known.delete(slug);
      changed = true;
    }
  }
  for (const slug of keySlugs) {
    if (known.has(slug)) continue;
    const raw = await readJson(`case-studies/${slug}.json`);
    if (raw && typeof raw.id === "string") {
      known.set(slug, raw);
      changed = true;
    }
  }
  if (changed) {
    await writeJson(INDEX_KEY, { version: 1, docs: [...known.values()] });
  }

  const result: CaseStudyDoc[] = [];
  for (const doc of known.values()) {
    const normalized = normalize(doc as Partial<CaseStudyDoc>);
    if (normalized) result.push(normalized);
  }

  return result.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
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

  const removed = await deleteKey(key);
  if (removed) await updateIndex(slug, null);
  return removed;
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