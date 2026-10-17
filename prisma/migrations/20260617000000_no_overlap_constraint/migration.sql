-- Postgres EXCLUDE constraint to make double-booking *physically impossible*
-- at the database level, even under concurrent inserts.
--
-- Run AFTER `prisma migrate dev` has created the Booking table. If you're
-- bootstrapping from zero, run `prisma migrate dev --name init` first, then
-- `prisma migrate dev` again to pick this up.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- A booking "occupies" the half-open range [startsAt, endsAt) for a given
-- washer. Two non-cancelled bookings whose ranges overlap will violate this
-- constraint and Postgres will reject the insert with SQLSTATE 23P01.
ALTER TABLE "Booking"
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    "washerId" WITH =,
    tsrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE (status <> 'CANCELLED');
