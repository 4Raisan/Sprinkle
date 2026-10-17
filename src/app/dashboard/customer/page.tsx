import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import type { Booking, BookingStatus, Service, User, WasherProfile } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/utils";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";

type DashboardBooking = Booking & {
  washer: WasherProfile & { user: User };
  service: Service;
};

export default async function CustomerDashboard({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ booked?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?callbackUrl=/dashboard/customer");

  const bookings: DashboardBooking[] = await prisma.booking.findMany({
    where: { customerId: session.user.id },
    include: { washer: { include: { user: true } }, service: true },
    orderBy: { startsAt: "desc" },
  });

  const now = new Date();
  const upcoming = bookings.filter((b) => b.startsAt >= now && b.status !== "CANCELLED");
  const past = bookings.filter((b) => b.startsAt < now || b.status === "CANCELLED");

  return (
    <div className="space-y-10">
      <Reveal>
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Your <span className="neon-text">bookings</span>
            </h1>
            <p className="mt-1 text-slate-400">
              Welcome back, {session.user.name?.split(" ")[0] ?? "friend"}.
            </p>
          </div>
          <Link href="/washers" className="btn-primary text-sm">
            Book another wash <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Reveal>

      {searchParams.booked && (
        <Reveal>
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 backdrop-blur">
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Demo booking created. Payments and email notifications are disabled.
            </span>
          </div>
        </Reveal>
      )}

      <Section title="Upcoming" bookings={upcoming} empty="No upcoming bookings yet." />
      <Section title="Past & cancelled" bookings={past} empty="No past bookings yet." />
    </div>
  );
}

function Section({
  title,
  bookings,
  empty,
}: {
  title: string;
  bookings: DashboardBooking[];
  empty: string;
}) {
  return (
    <Reveal>
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">{title}</h2>
        {bookings.length === 0 ? (
          <div className="card text-slate-400">{empty}</div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {bookings.map((b) => (
              <li key={b.id} className="card card-hover">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-base font-semibold">{b.service.name}</span>
                  <StatusPill status={b.status} />
                </div>
                <div className="mt-2 text-sm text-slate-300">
                  With <span className="text-white">{b.washer.user.name}</span> ·{" "}
                  {b.startsAt.toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {b.addressLine} · {formatCents(b.priceCents)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Reveal>
  );
}

function StatusPill({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, string> = {
    CONFIRMED: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
    PENDING: "bg-amber-500/15 text-amber-300 border-amber-400/30",
    COMPLETED: "bg-slate-500/15 text-slate-300 border-slate-400/30",
    CANCELLED: "bg-red-500/15 text-red-300 border-red-400/30",
    IN_PROGRESS: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
