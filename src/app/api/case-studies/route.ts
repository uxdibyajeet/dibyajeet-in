import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { applyStatusOrder, createCaseStudy, listCaseStudies } from "@/lib/caseStudyServer";

async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;
  const docs = await listCaseStudies();
  return NextResponse.json(docs);
}

export async function POST() {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;
  const doc = await createCaseStudy();
  return NextResponse.json(
    { slug: doc.id, order: doc.order, savedAt: doc.savedAt },
    { status: 201 },
  );
}

/**
 * Dashboard drag transaction: one request replaces status + display order for
 * a set of documents (e.g. the two columns touched by a drag). Sequential
 * per-document writes, so a drag is a single client-visible commit.
 */
export async function PUT(req: Request) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const body = (await req.json()) as {
    updates?: { id: string; status?: unknown; order?: unknown }[];
  };
  const updates = Array.isArray(body.updates) ? body.updates : null;
  if (!updates || updates.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  for (const update of updates) {
    if (
      typeof update.id !== "string" ||
      (update.status !== "published" && update.status !== "archived") ||
      typeof update.order !== "number" ||
      !Number.isFinite(update.order)
    ) {
      return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    }
  }

  const saved = await applyStatusOrder(
    updates as { id: string; status: "published" | "archived"; order: number }[],
  );
  return NextResponse.json({ ok: true, count: saved.length });
}