import { NextResponse } from "next/server";
import { createCaseStudy, listCaseStudies } from "@/lib/caseStudyServer";

export async function GET() {
  const docs = await listCaseStudies();
  return NextResponse.json(docs);
}

export async function POST() {
  const doc = await createCaseStudy();
  return NextResponse.json({ slug: doc.id }, { status: 201 });
}