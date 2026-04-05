import { signIn } from "@/auth";
import { cookies } from "next/headers";
import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ beta?: string }>;
}) {
  const params = await searchParams;
  const betaCode = params.beta || "";

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3"><LogoMark size={48} /></div>
          <h1 className="text-2xl font-bold">
            {betaCode ? "Join the Halt Beta" : "Create your account"}
          </h1>
          <p
            style={{ color: "var(--color-text-secondary)" }}
            className="mt-2 text-sm"
          >
            {betaCode
              ? "Sign up to activate your beta invite — 6 months of Pro, on us."
              : "Free forever — monitor up to 1 agent with 3 rules"}
          </p>
          {betaCode && (
            <div
              className="mt-3 inline-block px-3 py-1.5 rounded-lg text-xs font-mono"
              style={{
                backgroundColor: "var(--color-coral-soft)",
                color: "var(--color-coral)",
                border: "1px solid rgba(255, 107, 74, 0.2)",
                letterSpacing: "0.05em",
              }}
            >
              {betaCode.toUpperCase()}
            </div>
          )}
        </div>

        <form
          action={async () => {
            "use server";
            if (betaCode) {
              const cookieStore = await cookies();
              cookieStore.set("pending_beta_code", betaCode.toUpperCase(), {
                maxAge: 600,
                httpOnly: true,
                sameSite: "lax",
                path: "/",
              });
            }
            await signIn("github", { redirectTo: "/onboarding" });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm transition-all cursor-pointer"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Sign up with GitHub
          </button>
        </form>

        <div
          className="my-6 flex items-center gap-4"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
          <span className="text-xs">or sign up with email</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
        </div>

        <form
          action={async (formData: FormData) => {
            "use server";
            if (betaCode) {
              const cookieStore = await cookies();
              cookieStore.set("pending_beta_code", betaCode.toUpperCase(), {
                maxAge: 600,
                httpOnly: true,
                sameSite: "lax",
                path: "/",
              });
            }
            const email = formData.get("email") as string;
            await signIn("resend", { email, redirectTo: "/onboarding" });
          }}
        >
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            className="w-full px-4 py-3 rounded-lg text-sm mb-3 outline-none"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          />
          <button
            type="submit"
            className="w-full px-4 py-3 rounded-lg font-semibold text-sm text-white cursor-pointer"
            style={{ backgroundColor: "var(--color-coral)" }}
          >
            Send magic link
          </button>
        </form>

        <p
          className="text-center mt-6 text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--color-coral)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
