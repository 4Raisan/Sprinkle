import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";

test("fresh migrations reject concurrent overlaps but allow adjacent bookings", {
  skip: !process.env.DATABASE_TEST_URL,
}, async () => {
  const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_TEST_URL! } } });
  const suffix = randomUUID();
  const customerId = `qa-customer-${suffix}`;
  const washerUserId = `qa-washer-${suffix}`;
  let washerId: string | undefined;
  try {
    await db.user.createMany({ data: [
      { id: customerId, email: `${customerId}@example.invalid`, name: "QA Customer", passwordHash: "not-a-login" },
      { id: washerUserId, email: `${washerUserId}@example.invalid`, name: "QA Washer", role: "WASHER", passwordHash: "not-a-login" },
    ] });
    const washer = await db.washerProfile.create({ data: { userId: washerUserId } });
    washerId = washer.id;
    const service = await db.service.create({ data: { washerId, name: "QA Wash", durationMin: 60, priceCents: 3000 } });
    const start = new Date("2035-01-01T10:00:00Z");
    const end = new Date("2035-01-01T11:00:00Z");
    const data = { customerId, washerId, serviceId: service.id, startsAt: start, endsAt: end,
      addressLine: "QA only", priceCents: 3000, platformFeeCents: 600 };
    const results = await Promise.allSettled([db.booking.create({ data }), db.booking.create({ data })]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(results.filter(result => result.status === "rejected").length, 1);
    const rejected = results.find(result => result.status === "rejected") as PromiseRejectedResult;
    assert.match(String(rejected.reason), /23P01|bookings_no_overlap|exclusion constraint/i);
    await db.booking.create({ data: { ...data, startsAt: end, endsAt: new Date("2035-01-01T12:00:00Z") } });
    assert.equal(await db.booking.count({ where: { customerId } }), 2);
  } finally {
    await db.booking.deleteMany({ where: { customerId } });
    if (washerId) {
      await db.service.deleteMany({ where: { washerId } });
      await db.washerProfile.deleteMany({ where: { id: washerId } });
    }
    await db.user.deleteMany({ where: { id: { in: [customerId, washerUserId] } } });
    await db.$disconnect();
  }
});
