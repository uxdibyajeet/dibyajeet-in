import type { CaseStudyDoc } from "./caseStudy";

/**
 * Redis index for case-study documents.
 *
 * Blob is the durable source of truth (one doc == one blob); Redis mirrors the
 * full documents under a single JSON key so lists and single-doc reads are
 * strongly-consistent and instant, instead of waiting out Blob's eventual
 * consistency after overwrites. Every write path updates Blob first, then
 * Redis.
 *
 * Two backends are supported, auto-selected by whichever env vars are present:
 *
 *   1. Upstash REST – `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
 *      (or the legacy `KV_REST_API_URL` / `KV_REST_API_TOKEN`).
 *   2. RESP/TCP   – `REDIS_URL` (the token is embedded in the URI).
 *      Works with Redis Cloud, local Redis, or any RESP endpoint. The Redis
 *      JSON module must be enabled on the server; without it the commands
 *      throw and the app falls back to Blob.
 *
 * When neither backend is configured every function no-ops and the app falls
 * back to reading Blob directly (current default for local dev).
 */

const KEY = "portfolio:cs:docs";

/* ------------------------------------------------------------------ */
/*  Env discovery                                                      */
/* ------------------------------------------------------------------ */

const EXPLICIT_URL =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const EXPLICIT_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const RESP_URL = process.env.REDIS_URL ?? "";

export const kvAvailable = Boolean(EXPLICIT_URL || RESP_URL);

/* ------------------------------------------------------------------ */
/*  Backend interface + lazy singleton                                  */
/* ------------------------------------------------------------------ */

interface KvClient {
  readIndex(): Promise<Record<string, CaseStudyDoc> | null>;
  upsertDoc(doc: CaseStudyDoc): Promise<void>;
  removeDoc(id: string): Promise<void>;
  setIndex(map: Record<string, CaseStudyDoc>): Promise<void>;
}

let cachedClient: KvClient | null | undefined;

function makeUpstashClient(kv: {
  json: {
    get(key: string): Promise<unknown>;
    set(key: string, path: string, value: unknown): Promise<unknown>;
    del(key: string, path: string): Promise<unknown>;
  };
}): KvClient {
  return {
    async readIndex() {
      const v = await kv.json.get(KEY);
      return v && typeof v === "object"
        ? (v as Record<string, CaseStudyDoc>)
        : null;
    },
    async upsertDoc(doc) {
      await kv.json.set(KEY, `$.${doc.id}`, doc as unknown as Record<string, unknown>);
    },
    async removeDoc(id) {
      await kv.json.del(KEY, `$.${id}`);
    },
    async setIndex(map) {
      await kv.json.set(KEY, "$", map as unknown as Record<string, unknown>);
    },
  };
}

function makeRespClient(resp: {
  sendCommand(args: (string | Buffer)[]): Promise<unknown>;
}): KvClient {
  return {
    async readIndex() {
      const raw = await resp.sendCommand(["JSON.GET", KEY]);
      if (!raw) return null;
      const v = JSON.parse(String(raw));
      return v && typeof v === "object"
        ? (v as Record<string, CaseStudyDoc>)
        : null;
    },
    async upsertDoc(doc) {
      await resp.sendCommand([
        "JSON.SET",
        KEY,
        `$.${doc.id}`,
        JSON.stringify(doc),
      ]);
    },
    async removeDoc(id) {
      await resp.sendCommand(["JSON.DEL", KEY, `$.${id}`]);
    },
    async setIndex(map) {
      await resp.sendCommand(["JSON.SET", KEY, "$", JSON.stringify(map)]);
    },
  };
}

async function getClient(): Promise<KvClient | null> {
  if (cachedClient !== undefined) return cachedClient;

  try {
    if (EXPLICIT_URL && EXPLICIT_TOKEN) {
      // Upstash REST
      const { Redis } = await import("@upstash/redis");
      cachedClient = makeUpstashClient(
        new Redis({ url: EXPLICIT_URL, token: EXPLICIT_TOKEN }),
      );
    } else if (RESP_URL) {
      // RESP / Redis Cloud / local
      const { createClient } = await import("redis");
      const resp = createClient({
        url: RESP_URL,
        socket: { reconnectStrategy: () => 500 },
      });
      resp.on("error", (e: Error) => console.error("[redis-resp]", e));
      await resp.connect();
      // Ensure the root JSON key exists (idempotent).
      await resp.sendCommand(["JSON.SET", KEY, "$", "{}", "NX"]);
      cachedClient = makeRespClient(resp);
    } else {
      cachedClient = null;
    }
  } catch (error) {
    console.error("[kv] client init failed", error);
    cachedClient = null;
  }

  return cachedClient;
}

/* ------------------------------------------------------------------ */
/*  Public helpers                                                      */
/* ------------------------------------------------------------------ */

export async function readIndex(): Promise<Record<string, CaseStudyDoc> | null> {
  const client = await getClient();
  if (!client) return null;
  try {
    return await client.readIndex();
  } catch (error) {
    console.error("[kv] readIndex failed", error);
    return null;
  }
}

export async function upsertDoc(doc: CaseStudyDoc): Promise<void> {
  const client = await getClient();
  if (!client) return;
  try {
    await client.upsertDoc(doc);
  } catch (error) {
    console.error(`[kv] upsert ${doc.id} failed`, error);
  }
}

export async function removeDoc(id: string): Promise<void> {
  const client = await getClient();
  if (!client) return;
  try {
    await client.removeDoc(id);
  } catch (error) {
    console.error(`[kv] remove ${id} failed`, error);
  }
}

export async function setIndex(
  map: Record<string, CaseStudyDoc>,
): Promise<void> {
  const client = await getClient();
  if (!client) return;
  try {
    await client.setIndex(map);
  } catch (error) {
    console.error("[kv] setIndex failed", error);
  }
}