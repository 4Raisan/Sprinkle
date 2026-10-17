import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Plus, Trash2, EyeOff, Eye, Wallet, Sparkles, Clock } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/utils";
import { serviceSchema, availabilitySlotSchema } from "@/lib/validation";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";

async function currentWasherId() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "WASHER") throw new Error("Unauthorized");
  const profile = await prisma.washerProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!profile) throw new Error("Washer profile not found");
  return profile.id;
}

export default async function WasherDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?callbackUrl=/dashboard/washer");
  if (session.user.role !== "WASHER") {
    return (
      <div className="card border border-amber-400/30 bg-amber-500/10 text-sm text-amber-200">
        This dashboard is for washers.{" "}
        <a href="/dashboard/customer" className="text-cyan-300 underline">
          Go to your customer dashboard
        </a>
        .
      </div>
    );
  }

  const profile = await prisma.washerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      services: { orderBy: { priceCents: "asc" } },
      availability: { orderBy: { dayOfWeek: "asc" } },
      bookings: {
        include: { customer: true, service: true },
        orderBy: { startsAt: "desc" },
        take: 20,
      },
    },
  });
  if (!profile) {
    return <div className="card">Profile missing. Contact support.</div>;
  }

  // Earnings stats
  const completed = profile.bookings.filter((b) => b.status === "COMPLETED" || b.status === "CONFIRMED");
  const totalEarned = completed.reduce((sum, b) => sum + (b.priceCents - b.platformFeeCents), 0);
  const upcomingCount = profile.bookings.filter(
    (b) => b.startsAt >= new Date() && b.status !== "CANCELLED",
  ).length;

  return (
    <div className="space-y-10">
      <Reveal>
        <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Washer <span className="neon-text">command center</span>
            </h1>
            <p className="mt-1 text-slate-400">
              Hey {session.user.name?.split(" ")[0] ?? "there"} — let's get you booked.
            </p>
          </div>
        </header>
      </Reveal>

      {/* ----- Stats strip ----- */}
      <Reveal>
        <div className="neon-border rounded-2xl">
          <div className="grid grid-cols-2 divide-white/10 sm:grid-cols-3 sm:divide-x">
            <Stat label="Lifetime earnings" value={formatCents(totalEarned)} />
            <Stat label="Upcoming bookings" value={String(upcomingCount)} />
            <Stat label="Rating" value={`${profile.ratingAvg.toFixed(1)}★`} sub={`${profile.ratingCount} reviews`} />
          </div>
        </div>
      </Reveal>

      {/* ----- Stripe Connect ----- */}
      <Reveal delay={0.05}>
        <section className="card">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#22d3ee,#8b5cf6)] text-white shadow-glow">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold">Payouts</h2>
              <p className="mt-1 text-sm text-slate-400">Payouts are disabled in this demo. No Stripe account is linked or required.</p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ----- Services CRUD ----- */}
      <Reveal delay={0.1}>
        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Services</h2>
            <span className="text-xs text-slate-500">{profile.services.length} total</span>
          </div>

          <ul className="mt-4 divide-y divide-white/5">
            {profile.services.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium">
                    {s.name}
                    {!s.active && (
                      <span className="rounded-full border border-slate-400/30 bg-slate-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-300">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="h-3 w-3" /> {s.durationMin} min · {formatCents(s.priceCents)}
                  </div>
                </div>
                <form
                  action={async () => {
                    "use server";
                    const washerId = await currentWasherId();
                    await prisma.service.updateMany({
                      where: { id: s.id, washerId },
                      data: { active: !s.active },
                    });
                    revalidatePath("/dashboard/washer");
                  }}
                >
                  <button
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition"
                    title={s.active ? "Hide" : "Activate"}
                  >
                    {s.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {s.active ? "Hide" : "Activate"}
                  </button>
                </form>
              </li>
            ))}
            {profile.services.length === 0 && (
              <li className="py-4 text-sm text-slate-400">No services yet — add one below.</li>
            )}
          </ul>

          <form
            action={async (fd) => {
              "use server";
              const name = String(fd.get("name") ?? "");
              const durationMin = Number(fd.get("durationMin") ?? 30);
              const priceCents = Math.round(Number(fd.get("priceDollars") ?? 0) * 100);
              const washerId = await currentWasherId();
              const parsed = serviceSchema.safeParse({ name, durationMin, priceCents });
              if (!parsed.success) return;
              await prisma.service.create({
                data: { washerId, ...parsed.data },
              });
              revalidatePath("/dashboard/washer");
            }}
            className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr,7rem,8rem,auto]"
          >
            <input name="name" placeholder="Service name" className="input" required />
            <input
              name="durationMin"
              type="number"
              defaultValue={60}
              placeholder="Min"
              className="input"
            />
            <input
              name="priceDollars"
              type="number"
              step="0.01"
              placeholder="Price ($)"
              className="input"
              required
            />
            <button className="btn-primary text-sm">
              <Plus className="h-4 w-4" /> Add
            </button>
          </form>
        </section>
      </Reveal>

      {/* ----- Availability ----- */}
      <Reveal delay={0.15}>
        <section className="card">
          <h2 className="font-display text-lg font-semibold">Weekly availability</h2>
          <p className="text-xs text-slate-500">Recurring slots in UTC, one per row.</p>
          <ul className="mt-4 divide-y divide-white/5">
            {profile.availability.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][a.dayOfWeek]}
                </span>
                <span className="text-slate-400">
                  {a.startTime} – {a.endTime}
                </span>
                <form
                  action={async () => {
                    "use server";
                    const washerId = await currentWasherId();
                    await prisma.availability.deleteMany({ where: { id: a.id, washerId } });
                    revalidatePath("/dashboard/washer");
                  }}
                >
                  <button className="inline-flex items-center gap-1 text-xs text-red-300 hover:text-red-200 transition">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </form>
              </li>
            ))}
            {profile.availability.length === 0 && (
              <li className="py-3 text-sm text-slate-400">No availability set.</li>
            )}
          </ul>

          <form
            action={async (fd) => {
              "use server";
              const dow = Number(fd.get("dow"));
              const startTime = String(fd.get("startTime") ?? "");
              const endTime = String(fd.get("endTime") ?? "");
              const washerId = await currentWasherId();
              const parsed = availabilitySlotSchema.safeParse({ dayOfWeek: dow, startTime, endTime });
              if (!parsed.success) return;
              await prisma.availability.create({
                data: { washerId, ...parsed.data },
              });
              revalidatePath("/dashboard/washer");
            }}
            className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr,1fr,1fr,auto]"
          >
            <select name="dow" className="input">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((n, i) => (
                <option key={i} value={i} className="bg-ink-900">
                  {n}
                </option>
              ))}
            </select>
            <input name="startTime" type="time" defaultValue="09:00" className="input" />
            <input name="endTime" type="time" defaultValue="18:00" className="input" />
            <button className="btn-primary text-sm">
              <Plus className="h-4 w-4" /> Add slot
            </button>
          </form>
        </section>
      </Reveal>

      {/* ----- Recent bookings ----- */}
      <Reveal delay={0.2}>
        <section className="card">
          <h2 className="font-display text-lg font-semibold">Recent bookings</h2>
          {profile.bookings.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No bookings yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/5">
              {profile.bookings.map((b) => (
                <li key={b.id} className="py-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{b.service.name}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-300">
                      {b.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-slate-300">
                    {b.customer.name} · {b.startsAt.toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Earns {formatCents(b.priceCents - b.platformFeeCents)} (after{" "}
                    {formatCents(b.platformFeeCents)} platform fee)
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Reveal>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-6 py-7 text-center">
      <div className="font-display text-2xl font-bold neon-text">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-slate-400">{label}</div>
      {sub && <div className="mt-0.5 text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}
