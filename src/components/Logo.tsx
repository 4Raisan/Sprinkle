export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* The adjacent wordmark supplies the accessible name. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/mark.svg" width="28" height="28" alt="" className="shrink-0" />
      <span className="font-display text-lg font-bold tracking-tight text-slate-100">Sparkle</span>
    </span>
  );
}
