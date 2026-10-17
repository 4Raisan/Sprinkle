import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  durationMin: z.number().int().min(5).max(480),
  priceCents: z.number().int().min(100).max(1000000),
});

export const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
}).refine(slot => slot.startTime < slot.endTime, { message: "End time must be after start time." });
