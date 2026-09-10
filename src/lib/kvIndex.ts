import { createClient } from "@vercel/kv";
import type { CaseStudyDoc } from "./caseStudy";

/**
 * Vercel KV index for case-study documents.
 *
 * Blob is the durable source of truth (one doc == one blob); KV mirrors the
 * full documents under a single JSON key so lists and single-doc reads are
 * strongly-consistent and instant, instead of waiting out Blob's eventual
 * consistency after overwrites. Every write path updates Blob first, then KV.
 *
 * When KV is not configured (no env vars) every function no-ops and the app
 * falls back to reading Blob directly.
 */

const KEY = "portfolio:cs:docs";

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

const kv =
  typeof window === "undefined" && KV_URL && KV_TOKEN
    ? createClient({ url: KV_URL, token: KV_TOKEN })
    : null;

export const kvAvailable = Boolean(kv);

/** Read the whole index map (`slug -> doc`), or null when unavailable/absent. */
export async function readIndex(): Promise<Record<string, CaseStudyDoc> | null> {
  if (!kv) return null;
  try {
    const value = await kv.json.get(KEY);
    return value && typeof value === "object"
      ? (value as Record<string, CaseStudyDoc>)
      : null;
  } catch (error) {
    console.error("[kv] readIndex failed", error);
    return null;
  }
}

/** Upsert a single document entry. */
export async function upsertDoc(doc: CaseStudyDoc): Promise<void> {
  if (!kv) return;
  try {
    await kv.json.set(KEY, `$.${doc.id}`, doc as unknown as Record<string, unknown>);
  } catch (error) {
    console.error(`[kv] upsert ${doc.id} failed`, error);
  }
}

/** Remove a single document entry. */
export async function removeDoc(id: string): Promise<void> {
  if (!kv) return;
  try {
    await kv.json.del(KEY, `$.${id}`);
  } catch (error) {
    console.error(`[kv] remove ${id} failed`, error);
  }
}

/** Replace the whole index (seed/repair path). */
export async function setIndex(
  map: Record<string, CaseStudyDoc>,
): Promise<void> {
  if (!kv) return;
  try {
    await kv.json.set(KEY, "$", map as unknown as Record<string, unknown>);
  } catch (error) {
    console.error("[kv] setIndex failed", error);
  }
}