import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { availabilitySlotSchema } from "@/lib/validation";

const bodySchema = z.object({
  slots: z.array(availabilitySlotSchema).max(100),
});

/**
 * PUT /api/availability
 * Replaces the washer's availability with the supplied list of weekly slots.
 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "WASHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const profile = await prisma.washerProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ error: "No washer profile" }, { status: 400 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { washerId: profile.id } }),
    prisma.availability.createMany({
      data: parsed.data.slots.map((s) => ({ ...s, washerId: profile.id })),
    }),
  ]);

  const fresh = await prisma.availability.findMany({
    where: { washerId: profile.id },
    orderBy: { dayOfWeek: "asc" },
  });
  return NextResponse.json({ availability: fresh });
}
