import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { PageTracker } from "@/components/page-tracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "halt — Agent Monitoring for OpenClaw",
  description:
    "Real-time monitoring, smart rules, AI anomaly detection, kill switch, and auto-kill for your OpenClaw agents. One plugin, total control.",
  icons: {
    icon: { url: "/favicon.svg", type: "image/svg+xml" },
  },
  metadataBase: new URL("https://halt.dev"),
  openGraph: {
    title: "halt — Agent Monitoring for OpenClaw",
    description:
      "When your agent breaks your rules, halt stops it. Monitoring, smart rules, kill switch, and auto-kill in one plugin.",
    url: "https://halt.dev",
    siteName: "halt",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "halt — Agent Monitoring for OpenClaw",
    description:
      "When your agent breaks your rules, halt stops it. Monitoring, smart rules, kill switch, and auto-kill in one plugin.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://halt.dev",
  },
};

// Hardcoded inline script to prevent flash of wrong theme on page load.
// This is NOT user input — it reads from localStorage only. Safe to inline.
const themeScript = `
  (function() {
    var t = localStorage.getItem('halt-theme');
    if (t === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Theme script prevents flash — hardcoded constant, not user input */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Schema.org structured data — hardcoded constants, not user input */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "halt",
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Any",
              description:
                "Agent monitoring, smart rules, kill switch, and auto-kill for OpenClaw. When your agent breaks your rules, halt stops it.",
              url: "https://halt.dev",
              offers: [
                {
                  "@type": "Offer",
                  name: "Free",
                  price: "0",
                  priceCurrency: "USD",
                },
                {
                  "@type": "Offer",
                  name: "Pro",
                  price: "5",
                  priceCurrency: "USD",
                  billingIncrement: "P1M",
                },
                {
                  "@type": "Offer",
                  name: "Team",
                  price: "19",
                  priceCurrency: "USD",
                  billingIncrement: "P1M",
                },
              ],
              creator: {
                "@type": "Person",
                name: "David Kogan",
              },
              featureList: [
                "Real-time event capture",
                "Smart rules (threshold, rate, keyword, natural language)",
                "3-layer kill switch with auto-kill",
                "AI anomaly detection with behavioral baselines",
                "Multi-channel alerts (email, Telegram, Discord, SMS)",
                "Per-agent configurable auto-kill thresholds",
                "Works offline with local failsafe",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What is halt?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "halt is a monitoring and safety layer for autonomous AI agents running on OpenClaw. It watches everything your agent does, evaluates custom rules, and can instantly pause runaway agents.",
                  },
                },
                {
                  "@type": "Question",
                  name: "What is auto-kill?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "If an agent triggers 3 rule violations within 10 minutes, halt automatically shuts it down. No human intervention needed. The threshold and window are configurable per agent from your dashboard.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Does the kill switch actually work instantly?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes. Pattern rules block actions in-process via the before_tool_call hook with zero network latency. Manual kills arrive via WebSocket. Auto-kill shuts down agents after repeated violations automatically.",
                  },
                },
              ],
            }),
          }}
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <PageTracker />
          {children}
        </Providers>
      </body>
    </html>
  );
}
