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
}

export const DEFAULT_META: CaseStudyMeta = {
  title: "",
  role: "",
  duration: { start: null, end: null },
  tools: [],
  readingTime: 1,
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

export function caseStudyDocTitle(
  doc: Pick<CaseStudyDoc, "content" | "meta">,
): string {
  const metaTitle = doc.meta?.title?.trim();
  return metaTitle || caseStudyTitle(doc);
}