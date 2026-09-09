import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { CaseStudyDoc } from "@/lib/caseStudy";
import {
  deleteCaseStudy,
  patchCaseStudy,
  readCaseStudy,
  writeCaseStudy,
} from "@/lib/caseStudyServer";

async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;
  const { slug } = await params;
  const doc = await readCaseStudy(slug);
  if (!doc) {
    return NextResponse.json({ error: "Case study not found" }, { status: 404 });
  }
  return NextResponse.json(doc);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;
  const { slug } = await params;
  const body = (await req.json()) as Partial<CaseStudyDoc>;

  if (!body || typeof body !== "object" || body.schema !== "case-study-v1") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await writeCaseStudy(slug, body as CaseStudyDoc);
    return NextResponse.json({ ok: true, slug });
  } catch {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;
  const { slug } = await params;
  const body = (await req.json()) as { status?: string; order?: unknown };

  if (body.order !== undefined && typeof body.order !== "number") {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }
  if (
    body.status !== undefined &&
    body.status !== "published" &&
    body.status !== "archived"
  ) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (
    body.status === undefined &&
    body.order === undefined
  ) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const doc = await patchCaseStudy(slug, {
    status: body.status as "published" | "archived" | undefined,
    order: body.order as number | undefined,
  });
  if (!doc) {
    return NextResponse.json({ error: "Case study not found" }, { status: 404 });
  }
  return NextResponse.json(doc);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;
  const { slug } = await params;
  const ok = await deleteCaseStudy(slug);
  if (!ok) {
    return NextResponse.json({ error: "Case study not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, slug });
}