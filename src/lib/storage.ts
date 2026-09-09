import {
  del as blobDelete,
  get as blobGet,
  list as blobList,
  put as blobPut,
} from "@vercel/blob";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export type Json = Record<string, unknown>;

/**
 * Storage abstraction over the case-study "database".
 *
 * When a `BLOB_READ_WRITE_TOKEN` is present (production/Vercel) documents are
 * stored as JSON blobs in Vercel Blob under the `case-studies/` prefix, plus a
 * `case-studies/index.json` that keeps the dashboard list to a single cheap read.
 *
 * Without a token (local dev) it falls back to `.data/<key>` files so the
 * existing workflow is unchanged.
 */

const USE_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const LOCAL_DIR = path.join(process.cwd(), ".data");

function localPathFor(key: string): string | null {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_-]*\.json$/.test(key)) return null;
  if (key.includes("..")) return null;
  return path.join(LOCAL_DIR, key);
}

export async function readJson(key: string): Promise<Json | null> {
  if (USE_BLOB) {
    try {
      const result = await blobGet(key, { access: "public", useCache: false });
      if (!result || result.statusCode === 304 || !result.stream) return null;
      const text = await new Response(result.stream).text();
      const parsed = JSON.parse(text) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Json) : null;
    } catch {
      return null;
    }
  }

  const file = localPathFor(key);
  if (!file) return null;
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Json) : null;
  } catch {
    return null;
  }
}

export async function writeJson(key: string, value: Json): Promise<void> {
  const body = JSON.stringify(value);
  if (USE_BLOB) {
    await blobPut(key, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }

  const file = localPathFor(key);
  if (!file) throw new Error(`Invalid storage key: ${key}`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body, "utf8");
}

export async function deleteKey(key: string): Promise<boolean> {
  if (USE_BLOB) {
    try {
      await blobDelete(key);
      return true;
    } catch {
      return false;
    }
  }

  const file = localPathFor(key);
  if (!file) return false;
  try {
    await unlink(file);
    return true;
  } catch {
    return false;
  }
}

export async function listKeys(prefix: string): Promise<string[]> {
  if (USE_BLOB) {
    const keys: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await blobList({ prefix, limit: 1000, cursor });
      for (const item of page.blobs) keys.push(item.pathname);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return keys;
  }

  const dir = path.join(LOCAL_DIR, prefix);
  try {
    await mkdir(dir, { recursive: true });
  } catch {
    return [];
  }
  const files = await readdir(dir);
  return files.map((file) => `${prefix}${file}`);
}