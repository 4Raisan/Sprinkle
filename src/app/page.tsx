"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Sparkles, Zap, ShieldCheck, MapPin, Star, ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import TiltCard from "@/components/TiltCard";
import AnimatedCounter from "@/components/AnimatedCounter";

// Load the 3D scene client-side only — keeps SSR fast and avoids three.js on the server.
const HeroScene = dynamic(() => import("@/components/HeroScene"), { ssr: false });

export default function HomePage() {
  return (
    <div className="space-y-24">
      {/* ------------------ HERO ------------------ */}
      <section className="relative grid items-center gap-10 lg:grid-cols-2">
        {/* Glass content */}
        <Reveal className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            New · Mobile car wash, on demand
          </span>
          <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Your ride,
            <br />
            <span className="neon-text animate-gradient-x bg-[length:200%_200%]">
              freshly sparkled.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-300">
            Book a vetted local washer who comes to you. Transparent pricing, real-time
            scheduling, two-sided trust. Or list your own service and start earning.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/washers" className="btn-primary text-base">
              Book a wash <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/auth/signup?role=WASHER" className="btn-ghost text-base">
              Become a washer
            </Link>
          </div>

          {/* Trust line */}
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-400">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-slate-200">4.9</span> avg washer rating
            </div>
            <div className="hidden h-3 w-px bg-white/10 sm:block" />
            <div>Powered by Stripe Connect · DB-level no-overlap booking</div>
          </div>
        </Reveal>

        {/* 3D scene */}
        <div className="relative h-[420px] w-full sm:h-[520px]">
          <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_60%)]" />
          <HeroScene />
        </div>
      </section>

      {/* ------------------ STATS STRIP ------------------ */}
      <Reveal>
        <div className="neon-border rounded-2xl">
          <div className="grid grid-cols-2 divide-white/10 sm:grid-cols-4 sm:divide-x">
            {[
              { v: 12500, suffix: "+", label: "Washes booked" },
              { v: 480, suffix: "+", label: "Active washers" },
              { v: 49, suffix: " cities", label: "Live now" },
              { v: 4.9, suffix: "★", label: "Avg. rating", isFloat: true },
            ].map((s, i) => (
              <div key={i} className="px-6 py-7 text-center">
                <div className="font-display text-3xl font-bold neon-text">
                  {s.isFloat ? (
                    <>
                      <span>4.9</span>
                      <span>{s.suffix}</span>
                    </>
                  ) : (
                    <AnimatedCounter to={s.v} suffix={s.suffix} />
                  )}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-slate-400">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ------------------ FEATURES ------------------ */}
      <section className="space-y-10">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Built like the future, <span className="neon-text">priced like the present</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-400">
            Real software where everyone else has a Google Form. Glassy on the outside,
            obsessive on the inside.
          </p>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.1}>
              <TiltCard className="h-full">
                <div className="card card-hover h-full">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#22d3ee_0%,#8b5cf6_100%)] text-white shadow-glow">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{f.body}</p>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------ HOW IT WORKS ------------------ */}
      <section className="space-y-10">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            From dirty to <span className="neon-text">dazzling</span> in three steps
          </h2>
        </Reveal>
        <div className="relative grid gap-6 sm:grid-cols-3">
          <div className="absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent sm:block" />
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.12}>
              <div className="card card-hover relative h-full">
                <div className="absolute -top-3 left-5 rounded-full bg-[linear-gradient(135deg,#22d3ee,#8b5cf6)] px-3 py-1 text-xs font-bold text-white shadow-glow">
                  Step {i + 1}
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------ CTA ------------------ */}
      <Reveal>
        <div className="neon-border relative overflow-hidden rounded-3xl">
          <div className="relative px-8 py-14 text-center sm:py-20">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.15),transparent_60%)]" />
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Ready to <span className="neon-text">sparkle?</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              First wash on us when you sign up this week. No credit card needed.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/auth/signup" className="btn-primary text-base">
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/washers" className="btn-ghost text-base">
                Browse washers
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

const features = [
  {
    title: "On-demand, hyper-local",
    body: "Pick a slot, drop your address, watch your washer roll up. No call, no wait.",
    icon: MapPin,
  },
  {
    title: "Race-safe scheduling",
    body: "A Postgres EXCLUDE constraint makes double-booking literally impossible.",
    icon: Zap,
  },
  {
    title: "Trust, verified",
    body: "Two-sided ratings tied to completed jobs. Stripe Connect handles payouts.",
    icon: ShieldCheck,
  },
];

const steps = [
  {
    title: "Pick your sparkle",
    body: "Browse washers near you, see real prices, read verified reviews.",
  },
  {
    title: "Lock the slot",
    body: "Choose a time. Pay securely with Stripe. Get an instant confirmation.",
  },
  {
    title: "Drive away dazzling",
    body: "They show up, work their magic, you rate them. Done.",
  },
];
