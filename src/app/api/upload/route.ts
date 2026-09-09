import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Local dev (no blob store): keep the old data-URL behaviour.
    const dataUrl = `data:${file.type || "application/octet-stream"};base64,${bytes.toString("base64")}`;
    return NextResponse.json({ url: dataUrl });
  }

  const ext = file.name.includes(".")
    ? (file.name.split(".").pop() || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin"
    : "bin";
  const pathname = `uploads/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const blob = await put(pathname, bytes, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type || "application/octet-stream",
  });

  return NextResponse.json({ url: blob.url });
}