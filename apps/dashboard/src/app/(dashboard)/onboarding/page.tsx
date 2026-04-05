import { redirect } from "next/navigation";
import { getUserInfo } from "@/lib/server-api";
import { auth } from "@/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  // Provision user and get API key
  let apiKey: string | null = null;
  let keyPrefix: string | null = null;

  try {
    const res = await fetch(`${API_URL}/api/auth/provision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  return (
    <div className="max-w-lg mx-auto py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome to Clawnitor!</h1>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Let&apos;s get your first agent monitored in under 2 minutes.
        </p>
      </div>

      {/* Step 1: API Key */}
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
          <h2 className="font-semibold">Your API Key</h2>
        </div>
        {apiKey ? (
          <div>
            <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Save this key — it won&apos;t be shown again.
            </p>
            <code
              className="block px-4 py-3 rounded-lg text-sm break-all"
              style={{
                backgroundColor: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                fontFamily: "var(--font-mono)",
                color: "var(--color-coral)",
              }}
            >
              {apiKey}
            </code>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            API key: <code style={{ color: "var(--color-coral)", fontFamily: "var(--font-mono)" }}>{keyPrefix}••••••••</code>
            <br />
            <span className="text-xs">(Already created — check your previous setup)</span>
          </p>
        )}
      </div>

      {/* Step 2: Install Plugin */}
      <div
        className="p-6 rounded-xl mb-4"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: "var(--color-coral-soft)", color: "var(--color-coral)" }}
          >
            2
          </span>
          <h2 className="font-semibold">Install the Plugin</h2>
        </div>
        <code
          className="block px-4 py-3 rounded-lg text-sm"
          style={{
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            fontFamily: "var(--font-mono)",
            color: "var(--color-coral)",
          }}
        >
          openclaw plugins install @clawnitor/plugin
        </code>
      </div>

      {/* Step 3: Configure */}
      <div
        className="p-6 rounded-xl mb-4"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: "var(--color-coral-soft)", color: "var(--color-coral)" }}
          >
            3
          </span>
          <h2 className="font-semibold">Add Your Key</h2>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
          Add this to your <code style={{ fontFamily: "var(--font-mono)" }}>openclaw.json</code>:
        </p>
        <pre
          className="px-4 py-3 rounded-lg text-xs overflow-x-auto"
          style={{
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            fontFamily: "var(--font-mono)",
            color: "var(--color-text-secondary)",
          }}
        >
{`{
  "plugins": {
    "entries": {
      "clawnitor": {
        "config": {
          "apiKey": "${apiKey || keyPrefix + "..."}"
        }
      }
    }
  }
}`}
        </pre>
      </div>

      {/* Step 4: Data Sharing */}
      <div
        className="p-6 rounded-xl mb-6"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: "var(--color-coral-soft)", color: "var(--color-coral)" }}
          >
            4
          </span>
          <h2 className="font-semibold">Data Sharing (Optional)</h2>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
          Help make Clawnitor smarter for everyone — share anonymized usage patterns?
          We never share raw events, message content, or agent outputs.
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          You can change this anytime in Settings. Default: off.
        </p>
      </div>

      {/* Done */}
      <a
        href="/"
        className="block text-center px-6 py-3 rounded-lg font-semibold text-white text-sm"
        style={{ backgroundColor: "var(--color-coral)" }}
      >
        Go to Dashboard →
      </a>
    </div>
  );
}
