import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 md:px-12 py-20 max-w-3xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 mb-8 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        ← Back to home
      </Link>
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

      <div className="flex flex-col gap-8 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>What we collect</h2>
          <p>Clawnitor collects agent event data (tool calls, LLM requests, messages, lifecycle events) transmitted by the Clawnitor plugin running inside your OpenClaw agent. This data is used to provide monitoring, alerting, and safety features.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>Data redaction</h2>
          <p>Sensitive data (API keys, passwords, tokens, private keys) is automatically redacted by the plugin before transmission. We never intentionally collect secrets or credentials.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>Data sharing</h2>
          <p>Data sharing for improving Clawnitor is <strong style={{ color: "var(--color-text)" }}>opt-in and off by default</strong>. If enabled, only anonymized aggregate patterns are shared (rule trigger frequencies, common tool names, anomaly score distributions). We never share raw events, message content, file contents, or agent outputs.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>Event history</h2>
          <p>Free tier: events are stored for 7 days. Pro tier: events are stored for 90 days. After the retention window, events are permanently deleted.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>Account deletion</h2>
          <p>You can delete your account from Settings. Account deletion permanently removes all events, rules, baselines, agents, and billing information.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>Third-party services</h2>
          <p>We use: Stripe (billing), Resend (email), Anthropic Claude Haiku (AI anomaly detection for Pro users). Each processes only the minimum data required for their function.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>Contact</h2>
          <p>Questions about privacy? Email support@clawnitor.io.</p>
        </section>
      </div>
    </div>
  );
}
