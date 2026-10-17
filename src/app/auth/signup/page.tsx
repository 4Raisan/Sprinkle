import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import Reveal from "@/components/Reveal";

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(["CUSTOMER", "WASHER"]).default("CUSTOMER"),
});

export default async function SignUpPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ role?: string; error?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const defaultRole = searchParams.role === "WASHER" ? "WASHER" : "CUSTOMER";

  return (
    <div className="mx-auto max-w-md">
      <Reveal>
        <div className="neon-border rounded-2xl">
          <div className="p-7">
            <h1 className="font-display text-3xl font-bold">
              Create your <span className="neon-text">account</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {defaultRole === "WASHER" ? "Sign up as a washer." : "Sign up as a customer."}
            </p>

            {searchParams.error && (
              <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200 backdrop-blur">
                {searchParams.error === "exists"
                  ? "An account with that email already exists."
                  : "Could not sign up."}
              </div>
            )}

            <form
              action={async (formData) => {
                "use server";
                const parsed = signupSchema.safeParse({
                  email: formData.get("email"),
                  name: formData.get("name"),
                  password: formData.get("password"),
                  role: formData.get("role") ?? defaultRole,
                });
                if (!parsed.success) {
                  redirect(`/auth/signup?role=${defaultRole}&error=invalid`);
                }
                const data = parsed.data;

                const existing = await prisma.user.findUnique({ where: { email: data.email } });
                if (existing) {
                  redirect(`/auth/signup?role=${defaultRole}&error=exists`);
                }

                const passwordHash = await bcrypt.hash(data.password, 10);
                const user = await prisma.user.create({
                  data: {
                    email: data.email,
                    name: data.name,
                    passwordHash,
                    role: data.role,
                    ...(data.role === "WASHER" ? { washerProfile: { create: { baseRateCents: 2500 } } } : {}),
                  },
                });

                await signIn("credentials", {
                  email: data.email,
                  password: data.password,
                  redirectTo:
                    data.role === "WASHER" ? "/dashboard/washer" : "/dashboard/customer",
                });
              }}
              className="mt-6 space-y-4"
            >
              <Field label="Name" name="name" required />
              <Field label="Email" name="email" type="email" required />
              <Field label="Password" name="password" type="password" required minLength={8} />
              <label className="block">
                <span className="label">I am a…</span>
                <select name="role" defaultValue={defaultRole} className="input mt-1">
                  <option value="CUSTOMER" className="bg-ink-900">
                    Customer (book washes)
                  </option>
                  <option value="WASHER" className="bg-ink-900">
                    Washer (offer services)
                  </option>
                </select>
              </label>
              <button type="submit" className="btn-primary w-full">
                Create account <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link href="/auth/signin" className="text-cyan-400 hover:underline">
                Sign in
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
