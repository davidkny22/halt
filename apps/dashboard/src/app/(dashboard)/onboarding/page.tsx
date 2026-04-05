import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getUserInfo } from "@/lib/server-api";
import { CopyBlock, CopyMultiBlock } from "@/components/copy-block";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  // If user already has a key, skip onboarding
  const existingUser = await getUserInfo();
  if (existingUser?.has_key) {
    redirect("/dashboard");
  }

  let apiKey: string | null = null;
  let keyPrefix: string | null = null;

  try {
    const res = await fetch(`${API_URL}/api/auth/provision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": INTERNAL_SECRET,
        "X-User-Email": session.user.email,
      },
      body: JSON.stringify({
        email: session.user.email,
        github_id: session.user.id,
        name: session.user.name,
      }),
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      apiKey = data.api_key || null;
      keyPrefix = data.key_prefix;

    }
  } catch {}

  // Auto-redeem beta code if one was stored during signup
  let betaResult: { success?: boolean; type?: string; message?: string } | null = null;
  const cookieStore = await cookies();
  const pendingCode = cookieStore.get("pending_beta_code")?.value;
  if (pendingCode) {
    try {
      const res = await fetch(`${API_URL}/api/beta/redeem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": INTERNAL_SECRET,
          "X-User-Email": session.user.email,
        },
        body: JSON.stringify({ code: pendingCode }),
        cache: "no-store",
      });
      if (res.ok) {
        betaResult = await res.json();
      }
    } catch {}
    // Clear cookie after redemption attempt (success or fail — don't retry stale codes)
    cookieStore.delete("pending_beta_code");
  }

  // Send welcome email for new users — skip if beta email was already sent
  if (apiKey && !betaResult?.success) {
    fetch(`${API_URL}/api/auth/welcome`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": INTERNAL_SECRET,
      },
      body: JSON.stringify({ email: session.user.email }),
    }).catch(() => {});
  }

  const keyDisplay = apiKey || `${keyPrefix || "clw_live_"}...`;

  const configJson = `{
  "plugins": {
    "entries": {
      "halt": {
        "config": {
          "apiKey": "${keyDisplay}"
        }
      }
    }
  }
}`;

  return (
    <div className="max-w-lg mx-auto py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome to Halt!</h1>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {apiKey ? "Two steps to full agent monitoring." : "You're all set. Your API key is already configured."}
        </p>
      </div>

      {/* Beta activation banner */}
      {betaResult?.success && (
        <div
          className="p-4 rounded-xl mb-6"
          style={{
            background: "linear-gradient(135deg, rgba(255, 107, 74, 0.1) 0%, rgba(255, 107, 74, 0.03) 100%)",
            border: "1px solid rgba(255, 107, 74, 0.2)",
          }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--color-coral)" }}>
            {betaResult.type === "beta"
              ? "Beta access activated! 6 months of Pro, on us."
              : "Extended trial activated! 30 days of Pro."}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
            {betaResult.type === "beta"
              ? "You're a founding member. When your beta ends, you'll lock in $5/mo forever."
              : "All 50 beta spots were claimed, but you showed up early — enjoy the extended trial."}
          </p>
        </div>
      )}

      {/* API Key — prominent, copyable */}
      {apiKey && (
        <div
          className="p-4 rounded-xl mb-6"
          style={{
            background: "linear-gradient(135deg, rgba(74, 222, 128, 0.08) 0%, rgba(74, 222, 128, 0.02) 100%)",
            border: "1px solid rgba(74, 222, 128, 0.2)",
          }}
        >
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-green)" }}>
            Your API Key — save this now, it won&apos;t be shown again
          </p>
          <CopyBlock text={apiKey} />
        </div>
      )}

      {/* Step 1: Install */}
      <div
        className="p-6 rounded-xl mb-4"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: "var(--color-coral-soft)", color: "var(--color-coral)" }}
          >
            1
          </span>
          <h2 className="font-semibold">Install the plugin</h2>
        </div>
        <CopyBlock text="npm install @halt/plugin" />
      </div>

      {/* Step 2: Configure */}
      <div
        className="p-6 rounded-xl mb-6"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: "var(--color-coral-soft)", color: "var(--color-coral)" }}
          >
            2
          </span>
          <h2 className="font-semibold">Add to your openclaw.json</h2>
        </div>
        <CopyMultiBlock text={configJson} />
      </div>

      {/* Beta code prompt (only if not already redeemed via magic link) */}
      {!betaResult?.success && (
        <div
          className="p-4 rounded-xl mb-6"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p className="text-sm font-semibold mb-1">Have a beta invite code?</p>
          <p className="text-xs mb-0" style={{ color: "var(--color-text-secondary)" }}>
            Go to <a href="/settings" style={{ color: "var(--color-coral)", textDecoration: "underline" }}>Settings</a> and enter your code in the Billing section to unlock 6 months of free Pro.
          </p>
        </div>
      )}

      <a
        href="/dashboard"
        className="block text-center px-6 py-3 rounded-lg font-semibold text-white text-sm"
        style={{ backgroundColor: "var(--color-coral)" }}
      >
        Go to Dashboard
      </a>

      <p className="text-center text-xs mt-4" style={{ color: "var(--color-text-tertiary)" }}>
        Data sharing is off by default. Change it anytime in Settings.
      </p>
    </div>
  );
}
