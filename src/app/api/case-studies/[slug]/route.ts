import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { CaseStudyDoc } from "@/lib/caseStudy";
import {
  deleteCaseStudy,
  readCaseStudy,
  saveCaseStudy,
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
    const doc = await saveCaseStudy(slug, body);
    return NextResponse.json(doc);
  } catch {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;
  const { slug } = await params;
  const ok = await deleteCaseStudy(slug);
  return NextResponse.json({ ok, slug });
}