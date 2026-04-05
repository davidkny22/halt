import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clawnitor — Agent Monitoring for OpenClaw",
  description:
    "Real-time monitoring, alerting, and kill switch for your OpenClaw agents. Your agents run while you sleep. Clawnitor keeps its claws on them.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
