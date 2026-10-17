import { redirect } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/utils";
import { createBooking } from "@/lib/bookings";
import { randomUUID } from "crypto";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";

export default async function BookServicePage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ serviceId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const session = await auth();
  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=/book/${params.serviceId}`);
  }

  const service = await prisma.service.findUnique({
    where: { id: params.serviceId },
    include: { washer: { include: { user: true, availability: true } } },
  });
  if (!service) {
    return <div className="card text-center text-slate-400">Service not found.</div>;
  }

  const today = new Date();
  const dateOptions: { iso: string; label: string }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    d.setHours(10, 0, 0, 0);
    dateOptions.push({
      iso: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Reveal>
        <header className="card">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-cyan-300">
            <Sparkles className="h-3 w-3" /> Booking
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold">{service.name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            With <span className="text-white">{service.washer.user.name}</span> ·{" "}
            {service.durationMin} min ·{" "}
            <span className="font-semibold neon-text">{formatCents(service.priceCents)}</span>
          </p>
        </header>
      </Reveal>

      {searchParams.error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200 backdrop-blur">
          {searchParams.error}
        </div>
      )}

      <Reveal delay={0.1}>
        <form
          action={async (formData) => {
            "use server";
            const session2 = await auth();
            if (!session2?.user) {
              redirect(`/auth/signin?callbackUrl=/book/${params.serviceId}`);
            }

            const date = String(formData.get("date") ?? "");
            const time = String(formData.get("time") ?? "");
            const address = String(formData.get("address") ?? "");
            if (!date || !time || !address) {
              redirect(
                `/book/${params.serviceId}?error=${encodeURIComponent("All fields are required")}`,
              );
            }

            const startsAt = new Date(`${date}T${time}:00Z`);
            const idempotencyKey = randomUUID();

            const result = await createBooking({
              customerId: session2.user.id,
              serviceId: params.serviceId,
              startsAt,
              addressLine: address,
              idempotencyKey,
            });

            if (!result.ok) {
              redirect(`/book/${params.serviceId}?error=${encodeURIComponent(result.message)}`);
            }
            redirect(`/dashboard/customer?booked=${result.bookingId}`);
          }}
          className="card space-y-5"
        >
          <label className="block">
            <span className="label">Date</span>
            <select name="date" className="input mt-1">
              {dateOptions.map((d) => (
                <option key={d.iso} value={d.iso} className="bg-ink-900">
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Time (UTC)</span>
            <input
              type="time"
              name="time"
              defaultValue="10:00"
              min="09:00"
              max="17:00"
              className="input mt-1"
            />
          </label>
          <label className="block">
            <span className="label">Service address</span>
            <input
              name="address"
              placeholder="123 Main St, Brooklyn, NY"
              className="input mt-1"
              required
            />
          </label>

          <div className="flex items-center justify-between border-t border-white/5 pt-5">
            <span className="text-sm text-slate-400">
              Demo booking only. No payment will be taken.
            </span>
            <button type="submit" className="btn-primary">
              Confirm booking <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </Reveal>
    </div>
  );
}
