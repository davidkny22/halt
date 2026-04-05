import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clawnitor — Agent Monitoring for OpenClaw",
  description:
    "Real-time monitoring, alerting, and kill switch for your OpenClaw agents. Your agents run while you sleep. Clawnitor keeps its claws on them.",
  icons: {
    icon: { url: "/favicon.svg", type: "image/svg+xml" },
  },
};

// Hardcoded inline script to prevent flash of wrong theme on page load.
// This is NOT user input — it reads from localStorage only. Safe to inline.
const themeScript = `
  (function() {
    var t = localStorage.getItem('clawnitor-theme');
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
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
