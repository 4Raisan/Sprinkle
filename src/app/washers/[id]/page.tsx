import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, Clock, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/utils";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";

export default async function WasherDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const washer = await prisma.washerProfile.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      services: { where: { active: true }, orderBy: { priceCents: "asc" } },
      availability: { orderBy: { dayOfWeek: "asc" } },
    },
  });
  if (!washer) notFound();

  const dayName = (d: number) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d];

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <Reveal>
          <header className="card">
            <div className="flex items-start gap-5">
              <div className="relative h-20 w-20 shrink-0 rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#8b5cf6,#ec4899)] p-[2px] shadow-glow">
                <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-ink-900 font-display text-3xl font-bold text-white">
                  {washer.user.name.charAt(0)}
                </div>
              </div>
              <div className="flex-1">
                <h1 className="font-display text-3xl font-bold tracking-tight">
                  {washer.user.name}
                </h1>
                <p className="mt-1 inline-flex items-center gap-1.5 text-amber-300">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{washer.ratingAvg.toFixed(1)}</span>
                  <span className="text-slate-500">({washer.ratingCount} reviews)</span>
                </p>
                <p className="mt-3 text-slate-300">{washer.bio}</p>
              </div>
            </div>
          </header>
        </Reveal>

        <Reveal delay={0.1}>
          <section>
            <h2 className="mb-4 font-display text-xl font-bold">Services</h2>
            <ul className="space-y-3">
              {washer.services.map((s, i) => (
                <Reveal key={s.id} delay={i * 0.05}>
                  <li className="card card-hover flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{s.name}</div>
                      <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        {s.durationMin} min
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-display text-lg font-bold neon-text">
                        {formatCents(s.priceCents)}
                      </span>
                      <Link href={`/book/${s.id}`} className="btn-primary text-sm">
                        Book <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ul>
          </section>
        </Reveal>
      </div>

      <Reveal delay={0.2}>
        <aside className="card sticky top-24 h-fit">
          <h3 className="font-display text-base font-semibold">Weekly availability</h3>
          <ul className="mt-3 divide-y divide-white/5 text-sm">
            {washer.availability.map((a) => (
              <li key={a.id} className="flex justify-between py-2">
                <span className="font-medium text-slate-200">{dayName(a.dayOfWeek)}</span>
                <span className="text-slate-400">
                  {a.startTime} – {a.endTime}
                </span>
              </li>
            ))}
            {washer.availability.length === 0 && (
              <li className="py-2 text-slate-500">No availability set.</li>
            )}
          </ul>
        </aside>
      </Reveal>
    </div>
  );
}
