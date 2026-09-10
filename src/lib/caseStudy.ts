import type { OutputData } from "@editorjs/editorjs";
import { getCoverSnapshot, type CoverSnapshot } from "./coverStore";
import { getMetaSnapshot } from "./metaStore";
import { saveEditor } from "./editorStore";

export const CASE_STUDY_PREVIEW_SLUG = "preview";

/**
 * localStorage key written on every successful case-study save. Other tabs
 * (e.g. the open dashboard) listen for the storage event to refresh the list.
 */
export const CASE_STUDIES_CHANGED_KEY = "portfolio-case-studies-changed";

/**
 * localStorage mirror of "changes that have been written but may not be
 * visible to a fresh server read yet" (Vercel Blob overwrites propagate with
 * a delay). The dashboard overlays this over server data so refreshes during
 * the propagation window keep showing the user's intent, and clears each entry
 * once a fresh server read confirms it.
 */
export const CASE_STUDIES_PENDING_KEY = "portfolio-case-studies-pending";

/** Longest a pending change is kept unless a fresh server read confirms it. */
export const PENDING_MAX_AGE_MS = 45_000;

export interface PendingCard {
  kind: "set" | "delete";
  id: string;
  status: CaseStudyStatus;
  order: number;
  savedAt: string;
  title: string;
  cover: CoverSnapshot | null;
  at: number;
}

export function readPendingFromStorage(): Record<string, PendingCard> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CASE_STUDIES_PENDING_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PendingCard>;
    const out: Record<string, PendingCard> = {};
    const now = Date.now();
    for (const [id, entry] of Object.entries(parsed)) {
      if (!entry || typeof entry !== "object" || typeof entry.id !== "string") continue;
      if (now - Number(entry.at) > PENDING_MAX_AGE_MS) continue;
      out[id] = entry;
    }
    return out;
  } catch {
    return {};
  }
}

export function writePendingToStorage(pending: Record<string, PendingCard>): void {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    const fresh: Record<string, PendingCard> = {};
    for (const [id, entry] of Object.entries(pending)) {
      if (now - Number(entry.at) <= PENDING_MAX_AGE_MS) fresh[id] = entry;
    }
    window.localStorage.setItem(CASE_STUDIES_PENDING_KEY, JSON.stringify(fresh));
  } catch {
    // storage full/unavailable — pending stays best-effort in memory only
  }
}

/**
 * Record a just-saved change so both this tab and any open dashboard tab
 * (via the `storage` event) reflect it immediately. Mirrors the old inline
 * EditorNav behaviour shared by the card editor.
 */
export function broadcastCaseStudyChange(entry: PendingCard): void {
  if (typeof window === "undefined") return;
  writePendingToStorage({ ...readPendingFromStorage(), [entry.id]: entry });
  window.localStorage.setItem(CASE_STUDIES_CHANGED_KEY, Date.now().toString());
}

export type CaseStudyStatus = "published" | "archived";

export interface CaseStudyDuration {
  start: string | null;
  end: string | null;
}

export interface CaseStudyMeta {
  title: string;
  role: string;
  duration: CaseStudyDuration;
  tools: string[];
  readingTime: number;
  projectType: string[];
  projectDescription: string;
}

export const DEFAULT_META: CaseStudyMeta = {
  title: "",
  role: "",
  duration: { start: null, end: null },
  tools: [],
  readingTime: 1,
  projectType: [],
  projectDescription: "",
};

export interface CaseStudyDoc {
  schema: "case-study-v1";
  id: string;
  savedAt: string;
  status: CaseStudyStatus;
  order?: number;
  cover: CoverSnapshot | null;
  content: OutputData;
  meta: CaseStudyMeta;
}

export function readingTimeFromBlocks(blocks: OutputData["blocks"]): number {
  const words = blocks
    .map((block) => {
      const data = block.data as Record<string, unknown>;
      const text = typeof data.text === "string" ? data.text : "";
      return text.replace(STRIP_TAGS, " ").split(/\s+/).filter(Boolean).length;
    })
    .reduce((sum, count) => sum + count, 0);
  return Math.max(1, Math.round(words / 200));
}

export async function buildCaseStudyDoc(
  slug: string,
  status: CaseStudyStatus = "published",
): Promise<CaseStudyDoc> {
  const content = (await saveEditor()) as OutputData | undefined;
  if (!content) throw new Error("Editor is not ready yet");

  return {
    schema: "case-study-v1",
    id: slug,
    savedAt: new Date().toISOString(),
    status,
    cover: getCoverSnapshot(),
    content,
    meta: {
      ...DEFAULT_META,
      ...getMetaSnapshot(),
      readingTime: readingTimeFromBlocks(content.blocks),
    },
  };
}

const STRIP_TAGS = /<[^>]*>/g;

export function caseStudyTitle(doc: Pick<CaseStudyDoc, "content">): string {
  const header = doc.content.blocks.find((block) => block.type === "header");
  const text = header && "text" in header.data ? header.data.text : "";
  const clean = String(text).replace(STRIP_TAGS, " ").replace(/\s+/g, " ").trim();
  return clean || "Untitled";
}

export function caseStudyDescription(doc: Pick<CaseStudyDoc, "content">): string {
  const paragraph = doc.content.blocks.find((block) => block.type === "paragraph");
  if (!paragraph || !("text" in paragraph.data)) return "";
  return String(paragraph.data.text).replace(STRIP_TAGS, " ").replace(/\s+/g, " ").trim();
}

export function caseStudyDocTitle(
  doc: Pick<CaseStudyDoc, "content" | "meta">,
): string {
  const metaTitle = doc.meta?.title?.trim();
  return metaTitle || caseStudyTitle(doc);
}