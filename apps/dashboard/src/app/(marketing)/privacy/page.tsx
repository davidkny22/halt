import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 md:px-12 py-20 max-w-3xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 mb-8 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        ← Back to home
      </Link>
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-tertiary)" }}>Last updated: March 18, 2026</p>

      <div className="flex flex-col gap-8 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>What We Collect</h2>
          <p><strong style={{ color: "var(--color-text)" }}>Agent event data:</strong> Halt captures tool calls, LLM requests, messages, and lifecycle events from your OpenClaw agents via the Halt plugin. This data powers monitoring, alerting, rule evaluation, and anomaly detection.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Account data:</strong> Email address, name (via GitHub OAuth or email magic link), and billing information (via Stripe).</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Usage data:</strong> Dashboard interactions and feedback submitted through the in-app widget.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Auto-kill configuration:</strong> For each agent, Halt stores your auto-kill settings (enabled/disabled, violation threshold, detection window). Violation logs tracking rule breaches that trigger auto-kill are maintained in your workspace and are subject to the same retention policy as event data.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>Automatic Secret Redaction</h2>
          <p>Before any event data leaves your agent, the Halt plugin automatically redacts sensitive information using 25+ built-in patterns: API keys, passwords, tokens, SSH keys, AWS credentials, database connection strings, and OAuth tokens. Raw secrets are <strong style={{ color: "var(--color-text)" }}>never transmitted to or stored on Halt servers</strong>. You can add custom redaction patterns in your plugin configuration.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>Data Sharing</h2>
          <p>Anonymized data sharing is <strong style={{ color: "var(--color-text)" }}>opt-in and off by default</strong>. If enabled, only aggregate patterns are shared (rule trigger frequencies, common tool names, anomaly score distributions). This data may be used to power collective intelligence features such as shared anomaly baselines, community rule libraries, and model improvements. We never share raw events, message content, file contents, or agent outputs. You can toggle this anytime in Settings.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Halt does not sell, rent, or trade personal data to third parties.</strong></p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>Third-Party Services</h2>
          <p>We share the minimum data necessary with the following services:</p>
          <ul className="list-disc pl-6 mt-2 flex flex-col gap-1.5">
            <li><strong style={{ color: "var(--color-text)" }}>Stripe</strong> — payment processing (billing data only)</li>
            <li><strong style={{ color: "var(--color-text)" }}>Resend</strong> — email delivery for authentication links and alerts (email addresses only)</li>
            <li><strong style={{ color: "var(--color-text)" }}>Google</strong> — primary AI provider for anomaly detection and natural language rule evaluation. Event data is processed in real-time and is not retained by Google after processing.</li>
            <li><strong style={{ color: "var(--color-text)" }}>OpenAI</strong> — AI fallback provider and feedback categorization. If the primary provider is unavailable, Halt automatically switches to OpenAI. Data is not used for model training.</li>
            <li><strong style={{ color: "var(--color-text)" }}>Railway</strong> — database and infrastructure hosting (US region)</li>
            <li><strong style={{ color: "var(--color-text)" }}>GitHub</strong> — OAuth authentication (email address only, no repository access)</li>
          </ul>
          <p className="mt-3">If we add or change AI providers or other sub-processors, we will update this policy and notify users via email or dashboard notification.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>Interactive Demo</h2>
          <p>The <Link href="/demo" style={{ color: "var(--color-coral)" }}>/demo</Link> page does not require login and does not access any real agent data. When you run a demo scenario, your scenario selection and rule configuration are sent to OpenAI to generate simulated agent events. No personal data, real agent events, or account information is included in demo requests. Demo activity is not stored on Halt servers and is not used for model training.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>Authentication</h2>
          <p><strong style={{ color: "var(--color-text)" }}>GitHub OAuth:</strong> We request only your email address. We do not access your repositories, code, or any other GitHub data. You can revoke access anytime in GitHub Settings &gt; Applications.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Email magic links:</strong> Single-use login tokens are emailed via Resend, expire after 24 hours, and are deleted after use.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>Data Retention</h2>
          <p>Event data is retained based on your plan:</p>
          <ul className="list-disc pl-6 mt-2 flex flex-col gap-1.5">
            <li><strong style={{ color: "var(--color-text)" }}>Free:</strong> 7 days</li>
            <li><strong style={{ color: "var(--color-text)" }}>Pro / Trial:</strong> 90 days</li>
            <li><strong style={{ color: "var(--color-text)" }}>Team:</strong> 1 year</li>
            <li><strong style={{ color: "var(--color-text)" }}>Enterprise:</strong> Custom</li>
          </ul>
          <p className="mt-2">Account data is retained while your account is active. After account deletion, all data is permanently removed within 30 days.</p>
          <p className="mt-2">Landing page analytics (see below) are retained for 30 days.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>Your Rights</h2>
          <p><strong style={{ color: "var(--color-text)" }}>All users:</strong> You can access, correct, export, or delete your data from Settings at any time.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>EU users (GDPR):</strong> You have the right to access, correct, delete, port, and restrict processing of your data. You may opt out of AI-powered features and lodge a complaint with your data protection authority.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>California users (CCPA):</strong> You have the right to know what data is collected, request deletion, and opt out of data sharing. Halt does not sell personal data.</p>
          <p className="mt-2">To exercise these rights, email <a href="mailto:privacy@halt.dev" style={{ color: "var(--color-coral)" }}>privacy@halt.dev</a>. We respond within 45 days.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>Data Security</h2>
          <p>We employ industry-standard protections: encryption in transit (TLS), API keys hashed with bcrypt, role-based access control, automatic secret redaction before storage, and regular security reviews. While we implement reasonable safeguards, no system is 100% secure.</p>
          <p className="mt-2">For important limitations on kill switch and auto-kill functionality, please see our <Link href="/terms" style={{ color: "var(--color-coral)" }}>Terms of Service</Link> (Section 3).</p>
          <p className="mt-2">Report security vulnerabilities to <a href="mailto:security@halt.dev" style={{ color: "var(--color-coral)" }}>security@halt.dev</a>. We will acknowledge reports within 48 hours and provide a resolution timeline within 5 business days.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>Cookies &amp; Tracking</h2>
          <p>Halt does not use cookies for tracking, profiling, or marketing. Cookies are used only for session management (login tokens). No third-party analytics or tracking pixels are loaded.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Landing page analytics:</strong> Halt collects anonymous page view data on the marketing site (halt.dev) including page path, referrer URL, and inferred country (via request headers). This data is stored in our own database, is not linked to user accounts, and is used solely to understand traffic patterns. No browsing history, device fingerprints, or personal identifiers are collected. Analytics data is retained for 30 days and is not shared with third parties.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>Changes</h2>
          <p>We may update this policy from time to time. Material changes will be communicated via email or dashboard notification.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>Contact</h2>
          <p>Questions about privacy? Email <a href="mailto:privacy@halt.dev" style={{ color: "var(--color-coral)" }}>privacy@halt.dev</a>.</p>
        </section>
      </div>
    </div>
  );
}
