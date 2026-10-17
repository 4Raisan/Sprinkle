import { NextRequest, NextResponse } from "next/server";
import { serviceSchema as createSchema } from "@/lib/validation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const washerId = req.nextUrl.searchParams.get("washerId");
  const services = await prisma.service.findMany({
    where: { active: true, ...(washerId ? { washerId } : {}) },
    orderBy: { priceCents: "asc" },
  });
  return NextResponse.json({ services });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "WASHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const profile = await prisma.washerProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ error: "No washer profile" }, { status: 400 });

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: { ...parsed.data, washerId: profile.id },
  });
  return NextResponse.json({ service }, { status: 201 });
}
