import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.DEMO_MODE !== "true") throw new Error("Seeding requires DEMO_MODE=true.");
  if (await prisma.user.count() > 0) throw new Error("Seed only an empty dedicated demo database; existing data will not be replaced.");
  console.log("Seeding...");

  const passwordHash = await bcrypt.hash("password123", 10);

  // --- Customers ---
  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      name: "Alice Customer",
      passwordHash,
      role: Role.CUSTOMER,
      phone: "+15550001111",
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      name: "Bob Customer",
      passwordHash,
      role: Role.CUSTOMER,
      phone: "+15550002222",
    },
  });

  // --- Washers ---
  const washerSpecs = [
    { email: "wendy@example.com", name: "Wendy's Sparkle Wash", bio: "Eco-friendly hand wash, 5 yrs experience", lat: 40.7128, lng: -74.006 },
    { email: "raj@example.com", name: "Raj Mobile Detailing", bio: "Premium detail packages, ceramic coating optional", lat: 40.73, lng: -73.99 },
    { email: "mia@example.com", name: "Mia's Quick Clean", bio: "Express washes in under 30 min", lat: 40.72, lng: -74.01 },
  ];

  for (const w of washerSpecs) {
    const user = await prisma.user.upsert({
      where: { email: w.email },
      update: {},
      create: {
        email: w.email,
        name: w.name,
        passwordHash,
        role: Role.WASHER,
        phone: "+15559990000",
      },
    });

    const profile = await prisma.washerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        bio: w.bio,
        baseRateCents: 2500,
        serviceAreaKm: 15,
        latitude: w.lat,
        longitude: w.lng,
        ratingAvg: 4.5 + Math.random() * 0.4,
        ratingCount: 10 + Math.floor(Math.random() * 50),
      },
    });

    // Services per washer (idempotent via deleteMany + createMany)
    await prisma.service.deleteMany({ where: { washerId: profile.id } });
    await prisma.service.createMany({
      data: [
        { washerId: profile.id, name: "Express Exterior Wash", durationMin: 30, priceCents: 2500 },
        { washerId: profile.id, name: "Standard Wash + Vacuum", durationMin: 60, priceCents: 4500 },
        { washerId: profile.id, name: "Premium Detail", durationMin: 120, priceCents: 12000 },
      ],
    });

    // Availability: Mon-Sat 9:00-18:00
    await prisma.availability.deleteMany({ where: { washerId: profile.id } });
    await prisma.availability.createMany({
      data: [1, 2, 3, 4, 5, 6].map((d) => ({
        washerId: profile.id,
        dayOfWeek: d,
        startTime: "09:00",
        endTime: "18:00",
      })),
    });
  }

  // --- Sample booking: Alice books Wendy's standard wash tomorrow at 10:00 ---
  const wendyProfile = await prisma.washerProfile.findFirstOrThrow({
    where: { user: { email: "wendy@example.com" } },
    include: { services: true },
  });

  const standardService = wendyProfile.services.find((s) => s.name === "Standard Wash + Vacuum")!;

  const tomorrow10 = new Date();
  tomorrow10.setUTCDate(tomorrow10.getUTCDate() + 1);
  tomorrow10.setUTCHours(10, 0, 0, 0);
  const tomorrow11 = new Date(tomorrow10.getTime() + 60 * 60 * 1000);

  await prisma.booking.deleteMany({ where: { customerId: alice.id } });
  await prisma.booking.create({
    data: {
      customerId: alice.id,
      washerId: wendyProfile.id,
      serviceId: standardService.id,
      startsAt: tomorrow10,
      endsAt: tomorrow11,
      status: "PENDING",
      addressLine: "123 Main St, Brooklyn, NY",
      latitude: 40.7,
      longitude: -73.99,
      priceCents: standardService.priceCents,
      platformFeeCents: Math.round(standardService.priceCents * 0.2),
    },
  });

  console.log("Seed complete.");
  console.log("Customers:  alice@example.com / bob@example.com  (password: password123)");
  console.log("Washers:    wendy@example.com / raj@example.com / mia@example.com  (password: password123)");
  void bob;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
