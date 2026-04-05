import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen px-6 md:px-12 py-20 max-w-3xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 mb-8 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        ← Back to home
      </Link>
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-tertiary)" }}>Last updated: March 18, 2026</p>

      <div className="flex flex-col gap-8 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>1. The Service</h2>
          <p>Clawnitor is an agent monitoring and safety tool for OpenClaw. It captures events, evaluates rules, detects anomalies, fires alerts, and provides a kill switch and auto-kill system to pause agent execution. The Service is provided by David Kogan (&quot;we&quot;, &quot;us&quot;, &quot;Clawnitor&quot;).</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>2. Service Disclaimer &amp; Availability</h2>
          <p>The Service is provided <strong style={{ color: "var(--color-text)" }}>&quot;AS IS&quot; and &quot;AS AVAILABLE&quot;</strong> without warranty of any kind, whether express, implied, or statutory. We disclaim all warranties including merchantability, fitness for a particular purpose, and non-infringement.</p>
          <p className="mt-3">We do not warrant that the Service will be uninterrupted, error-free, or that the kill switch will function without failure or delay. The Service may contain bugs, errors, or incomplete functionality.</p>
          <p className="mt-3"><strong style={{ color: "var(--color-text)" }}>Availability:</strong> We use commercially reasonable efforts to maintain uptime but make no specific uptime guarantees. Scheduled maintenance will be announced in advance when possible. The kill switch is monitored continuously but has no formal SLA.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>3. Kill Switch &amp; Auto-Kill Disclaimer</h2>
          <p>The Kill Switch and Auto-Kill features are provided as additional safeguards but are <strong style={{ color: "var(--color-text)" }}>not guaranteed to execute in all scenarios</strong>. You acknowledge that:</p>
          <ul className="list-disc pl-6 mt-2 flex flex-col gap-1.5">
            <li>The kill switch may fail due to network latency, plugin conflicts, or system errors</li>
            <li>The kill switch may delay execution by seconds or minutes</li>
            <li>The kill switch may only partially block dangerous actions</li>
            <li>Auto-kill depends on accurate rule violation detection and may not trigger if the plugin crashes or the threshold is misconfigured</li>
            <li>Auto-kill thresholds are configurable per agent — overly permissive settings may allow violations before shutdown</li>
            <li>We provide no guarantee of 100% successful termination of agent operations</li>
            <li>You must not rely solely on the kill switch or auto-kill as your primary safety mechanism</li>
          </ul>
          <p className="mt-3"><strong style={{ color: "var(--color-text)" }}>Clawnitor is one layer of defense, not a guarantee of safety.</strong> You are responsible for implementing independent safety measures appropriate for your use case.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>4. AI-Powered Features</h2>
          <p>AI-powered features (anomaly detection, natural language rules, feedback categorization) are based on statistical analysis and machine learning. We make no warranty that they will detect all anomalies, achieve any particular detection rate, or identify threats before they cause harm. AI results are non-deterministic and may vary between requests. The Service is not a substitute for active monitoring and human oversight.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>5. Your Responsibilities &amp; Acceptable Use</h2>
          <p>You acknowledge and agree that:</p>
          <ul className="list-disc pl-6 mt-2 flex flex-col gap-1.5">
            <li>You remain solely responsible for the actions and outputs of your agents</li>
            <li>You must implement your own independent safeguards and monitoring</li>
            <li>You accept all risks associated with using autonomous AI agents</li>
            <li>You are responsible for maintaining the confidentiality of your API key</li>
          </ul>
          <p className="mt-3"><strong style={{ color: "var(--color-text)" }}>You agree not to:</strong></p>
          <ul className="list-disc pl-6 mt-2 flex flex-col gap-1.5">
            <li>Use Clawnitor to enable, facilitate, or conceal malicious or harmful agent behavior</li>
            <li>Bypass, disable, or circumvent safety mechanisms, kill switches, or auto-kill for harmful purposes</li>
            <li>Attempt to access other users&apos; agents, data, rules, or account information</li>
            <li>Use the Service to facilitate fraud, hacking, harassment, or any illegal activity</li>
            <li>Configure rules intentionally to prevent legitimate safety shutdowns</li>
            <li>Generate excessive load on the Service, spam alerts, or abuse API rate limits</li>
            <li>Reverse-engineer, decompile, or attempt to extract the source code of the Service</li>
          </ul>
          <p className="mt-3">We reserve the right to monitor for violations and may cooperate with law enforcement regarding illegal activity.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>6. Limitation of Liability</h2>
          <p>IN NO EVENT SHALL CLAWNITOR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES, INCLUDING BUT NOT LIMITED TO LOST PROFITS, REVENUE, DATA, OR GOODWILL, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>
          <p className="mt-3">Clawnitor&apos;s total aggregate liability for any claim arising from or relating to this Service shall not exceed the amount you have paid us in the 12 months immediately preceding the claim.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>7. Intellectual Property</h2>
          <p><strong style={{ color: "var(--color-text)" }}>Your data:</strong> You retain all intellectual property rights to your agent code, prompts, event data, rules, and configurations. We claim no ownership over your data.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Service license:</strong> We grant you a limited, non-exclusive, non-transferable license to use the Service in accordance with these terms and your subscription plan.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Data processing license:</strong> You grant Clawnitor a limited license to process your data solely to provide the Service to you (event storage, rule evaluation, anomaly detection, alerting).</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Collective intelligence (opt-in):</strong> If you enable data sharing in Settings (off by default), you grant Clawnitor an additional license to use anonymized, aggregated data derived from your usage for improving the Service, including collective anomaly baselines, community rule libraries, and model training. Raw events, message content, and personally identifiable information are never included. You may revoke this license at any time by disabling data sharing.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Clawnitor IP:</strong> The Service, plugin, algorithms, documentation, and branding are proprietary to Clawnitor. You may not copy, modify, distribute, or create derivative works from the Service without prior written consent.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Shared rules:</strong> Rules shared with team members via Team or Enterprise features may be viewed, copied, and modified by authorized team members. You warrant you have the right to share any rules you distribute.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>8. Pricing, Billing &amp; Tier Limitations</h2>
          <p><strong style={{ color: "var(--color-text)" }}>Billing cycle:</strong> Paid subscriptions are billed monthly on the same date each month via Stripe.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Founding member pricing:</strong> Pricing for founding members is locked at the rate active when they first subscribed. If you cancel and re-subscribe, current pricing applies.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Refunds:</strong> Refunds are available within 7 days of charge. Refunds are not available for free tier, beta, or trial accounts. Refunds are processed to the original payment method within 5-10 business days.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Failed payments:</strong> If a payment fails, we will retry up to 3 times over 10 days. After 3 failed attempts, your account will be downgraded to the free tier.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Upgrades and downgrades:</strong> Upgrades take effect immediately. Downgrades take effect at the start of the next billing cycle.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Free tier:</strong> Limited to 1 agent, 3 pattern rules, 1 manual kill switch activation per month, 7-day event history, and email alerts only. Kill actions exceeding tier limits are rejected. Auto-kill and AI anomaly detection are not available on the free tier.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Trial and beta access:</strong> Trial subscriptions automatically expire after the stated period (14 days standard, extended periods for beta participants). Upon expiry, your account reverts to the free tier. Rules, baselines, and settings are preserved but paid features become unavailable. Events beyond the free tier retention period (7 days) are permanently deleted.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>9. Early Access &amp; Beta Features</h2>
          <p>Clawnitor is under active development. Features may change, be modified, or be discontinued without notice. Free tier and beta features are provided without warranty and may have reduced availability or feature restrictions. Do not rely on beta features for critical safety decisions.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>10. Third-Party Services</h2>
          <p>Clawnitor integrates with third-party services including OpenClaw, Google, OpenAI, Stripe, Resend, Railway, and GitHub. We are not responsible for:</p>
          <ul className="list-disc pl-6 mt-2 flex flex-col gap-1.5">
            <li>Outages or failures of third-party services</li>
            <li>Changes to third-party APIs, features, or pricing</li>
            <li>Data processed by third-party AI providers</li>
            <li>Third-party security breaches</li>
          </ul>
          <p className="mt-3">Third-party services are subject to their own terms of service. Your use of Clawnitor constitutes acknowledgment of these dependencies.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>11. Indemnification</h2>
          <p>You agree to indemnify, defend, and hold harmless Clawnitor and its officers, employees, and agents from any claim, liability, damage, or cost (including legal fees) arising from:</p>
          <ul className="list-disc pl-6 mt-2 flex flex-col gap-1.5">
            <li>Your agents&apos; actions or outputs</li>
            <li>Your use of the Service in violation of these Terms</li>
            <li>Your breach of applicable laws or regulations</li>
            <li>Harm to third parties caused by your agents or your use of the Service</li>
          </ul>
          <p className="mt-3">This indemnification does not apply to claims arising solely from Clawnitor&apos;s negligence or willful misconduct.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>12. Account Termination</h2>
          <p><strong style={{ color: "var(--color-text)" }}>By you:</strong> You may delete your account at any time from Settings. Upon deletion, all data is permanently removed within 30 days.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>By us:</strong> We may suspend your account immediately if you violate the Acceptable Use Policy, use the Service to enable harmful agent behavior, attempt unauthorized access, or accumulate unpaid charges. We will notify you of suspension via email within 24 hours. Suspension becomes termination if not resolved within 7 days.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Upon termination:</strong> All data is deleted per the above timeline. No refund is issued for the current billing period. Outstanding charges remain due. You may appeal termination by emailing <a href="mailto:legal@clawnitor.io" style={{ color: "var(--color-coral)" }}>legal@clawnitor.io</a>.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>13. Governing Law &amp; Dispute Resolution</h2>
          <p><strong style={{ color: "var(--color-text)" }}>Governing law:</strong> These Terms are governed by the laws of the State of Delaware, without regard to conflicts of law principles.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Arbitration:</strong> Any claim or dispute arising under or relating to these Terms shall be resolved by binding arbitration under the American Arbitration Association (AAA) rules, with a single arbitrator in Delaware. You waive the right to a jury trial and to participate in a class action.</p>
          <p className="mt-2"><strong style={{ color: "var(--color-text)" }}>Exceptions:</strong> Either party may seek injunctive or equitable relief in any court of competent jurisdiction to protect intellectual property rights.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>14. Changes to Terms</h2>
          <p>We may update these terms from time to time. Material changes will be communicated via email or dashboard notification at least 14 days before they take effect. Continued use of the Service after changes constitutes acceptance.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>15. Contact</h2>
          <p>Questions about these terms? Email <a href="mailto:legal@clawnitor.io" style={{ color: "var(--color-coral)" }}>legal@clawnitor.io</a>.</p>
        </section>
      </div>
    </div>
  );
}
