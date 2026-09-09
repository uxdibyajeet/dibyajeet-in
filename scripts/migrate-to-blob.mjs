// Migrates local dev documents (.data/case-studies/*.json) to Vercel Blob.
// Run from the project root with your blob token:
//
//   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... node scripts/migrate-to-blob.mjs
//
// Inline base64 images (cover + editor blocks) are uploaded to `uploads/`
// and replaced with their blob URLs so documents stay small.
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error("BLOB_READ_WRITE_TOKEN is required. Set it before running.");
  process.exit(1);
}

const dir = path.join(process.cwd(), ".data", "case-studies");
const RE_DATA_URL = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

async function uploadBytes(base64, mime) {
  const buf = Buffer.from(base64, "base64");
  const ext =
    mime === "image/png" ? "png" : mime === "image/gif" ? "gif" : "jpeg";
  const pathname = `uploads/${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const blob = await put(pathname, buf, {
    access: "public",
    addRandomSuffix: false,
    contentType: mime,
  });
  return blob.url;
}

async function replaceDataUrls(value) {
  if (typeof value === "string") {
    const match = value.match(RE_DATA_URL);
    if (match) {
      const url = await uploadBytes(match[2], match[1]);
      console.log(`  replaced data URL -> ${url.slice(0, 60)}...`);
      return url;
    }
    return value;
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) out.push(await replaceDataUrls(item));
    return out;
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = await replaceDataUrls(v);
    return out;
  }
  return value;
}

const files = (await readdir(dir)).filter((f) => f.endsWith(".json") && f !== "index.json");
const docs = [];

for (const file of files) {
  const slug = file.replace(/\.json$/, "");
  const raw = JSON.parse(await readFile(path.join(dir, file), "utf8"));
  console.log(`Migrating ${slug}...`);
  const doc = await replaceDataUrls(raw);
  await put(`case-studies/${slug}.json`, JSON.stringify(doc), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  docs.push(doc);
}

const index = JSON.stringify({ version: 1, docs });
await put("case-studies/index.json", index, {
  access: "public",
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: "application/json",
});
await writeFile(path.join(dir, "index.json"), index, "utf8");

console.log(`Done. Migrated ${docs.length} document(s).`);