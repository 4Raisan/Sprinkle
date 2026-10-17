import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import Reveal from "@/components/Reveal";

export default async function SignInPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const callbackUrl = searchParams.callbackUrl?.startsWith("/") && !searchParams.callbackUrl.startsWith("//")
    ? searchParams.callbackUrl : "/dashboard/customer";
  return (
    <div className="mx-auto max-w-md">
      <Reveal>
        <div className="neon-border rounded-2xl">
          <div className="p-7">
            <h1 className="font-display text-3xl font-bold">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-400">Sign in to your Sparkle account.</p>

            {searchParams.error && (
              <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200 backdrop-blur">
                Invalid email or password.
              </div>
            )}

            <form
              action={async (formData) => {
                "use server";
                try {
                  await signIn("credentials", {
                    email: formData.get("email"),
                    password: formData.get("password"),
                    redirectTo: callbackUrl,
                  });
                } catch (error) {
                  if (error instanceof AuthError) redirect(`/auth/signin?error=credentials&callbackUrl=${encodeURIComponent(callbackUrl)}`);
                  throw error;
                }
              }}
              className="mt-6 space-y-4"
            >
              <Field label="Email" name="email" type="email" required />
              <Field label="Password" name="password" type="password" required />
              <button type="submit" className="btn-primary w-full">
                Sign in <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-400">
              No account?{" "}
              <Link href="/auth/signup" className="text-cyan-400 hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input {...props} className="input mt-1" />
    </label>
  );
}
