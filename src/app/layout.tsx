import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import Logo from "@/components/Logo";
import BackgroundBlobs from "@/components/BackgroundBlobs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sparkle — Mobile Car Wash, Reimagined",
  description: "Book a mobile car wash on demand. A futuristic marketplace for sparkling rides.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en">
      <body>
        <BackgroundBlobs />

        <header className="sticky top-3 z-30 mx-auto mt-3 w-[min(96%,72rem)]">
          <div className="glass-strong flex items-center justify-between rounded-full px-5 py-2.5 shadow-glow">
            <Link href="/" className="hover:opacity-90 transition">
              <Logo />
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/washers"
                className="rounded-full px-3 py-1.5 text-slate-300 hover:bg-white/5 hover:text-white transition"
              >
                Find a wash
              </Link>
              {session?.user ? (
                <>
                  <Link
                    href={session.user.role === "WASHER" ? "/dashboard/washer" : "/dashboard/customer"}
                    className="rounded-full px-3 py-1.5 text-slate-300 hover:bg-white/5 hover:text-white transition"
                  >
                    Dashboard
                  </Link>
                  <span className="hidden text-xs text-slate-500 sm:inline">
                    {session.user.email}
                  </span>
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/" });
                    }}
                  >
                    <button className="btn-ghost ml-2 px-4 py-1.5 text-sm">Sign out</button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="rounded-full px-3 py-1.5 text-slate-300 hover:bg-white/5 hover:text-white transition"
                  >
                    Sign in
                  </Link>
                  <Link href="/auth/signup" className="btn-primary ml-2 px-4 py-1.5 text-sm">
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          {children}
        </main>

        <footer className="mt-20 border-t border-white/5 py-8 text-center text-xs text-slate-500">
          <div className="mx-auto max-w-6xl px-4">
            <span className="neon-text font-semibold">Sparkle</span> · Mobile car wash marketplace ·
            Built with care
          </div>
        </footer>
      </body>
    </html>
  );
}
