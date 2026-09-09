import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCaseStudy, listCaseStudies } from "@/lib/caseStudyServer";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const docs = await listCaseStudies();
  return NextResponse.json(docs);
}

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const doc = await createCaseStudy();
  return NextResponse.json({ slug: doc.id }, { status: 201 });
}