import { NextResponse, type NextRequest } from "next/server";

const MARKETING_PATHS = ["/", "/pricing", "/privacy", "/terms", "/demo", "/docs"];
const PUBLIC_PATHS = ["/api", "/_next", "/favicon.ico", "/favicon.svg", "/health", "/login", "/signup", "/check-email", "/robots.txt", "/sitemap.xml", "/llms.txt", "/.well-known"];

function hasSessionCookie(req: NextRequest): boolean {
  // Auth.js v5 cookie names (secure in prod, non-secure in local dev)
  return Boolean(
    req.cookies.get("__Secure-authjs.session-token")?.value ||
      req.cookies.get("authjs.session-token")?.value
  );
}

// Markdown summaries for AI agents requesting text/markdown
const MARKDOWN_PAGES: Record<string, string> = {
  "/": `# Clawnitor — Agent Monitoring for OpenClaw

When your agent breaks your rules, Clawnitor stops it.

## Features
- Event capture for every tool call, LLM request, message
- Smart rules: threshold, rate, keyword, natural language
- 3-layer kill switch: server kill state, local failsafe, cached rule evaluation
- Auto-kill: agents shut down after repeated violations (configurable per agent)
- AI anomaly detection with 72-hour behavioral baselines
- Alerts via email, Telegram, Discord, SMS
- Works offline with local failsafe

## Pricing
- Free: $0 — 1 agent, 3 rules, 1 manual kill/mo
- Pro: $5/mo — unlimited kills + auto-kill, AI detection, NL rules
- Team: $19/mo — 5 agents, 20 NL rules, 10 members
- Enterprise: custom

## Links
- Demo: https://clawnitor.io/demo
- Docs: https://clawnitor.io/docs
- Signup: https://app.clawnitor.io/signup
- Install: openclaw plugins install @clawnitor/plugin
`,
  "/pricing": `# Clawnitor Pricing

| Tier | Price | Agents | Rules | Kill Switch | AI Detection |
|------|-------|--------|-------|-------------|--------------|
| Free | $0 | 1 | 3 pattern | 1 manual/mo | No |
| Pro | $5/mo | 1 (+$3/ea) | Unlimited + 5 NL | Unlimited + auto-kill | Yes (15-min) |
| Team | $19/mo | 5 (+$2/ea) | Unlimited + 20 NL | Unlimited + auto-kill | Yes (5-min) |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited | Yes |

14-day free trial of Pro. No credit card required.
`,
  "/demo": `# Clawnitor Interactive Demo

Try the demo at https://clawnitor.io/demo — no signup required.

Pick a scenario (Rogue Email Agent, Destructive Deploy, Spend Spiraler, or Custom Sandbox), set your rules, and watch a live AI agent try to break them. Clawnitor catches violations in real time and auto-kills the agent after repeated violations.
`,
};

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Serve markdown to AI agents that request it
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/markdown") && MARKDOWN_PAGES[pathname]) {
    return new NextResponse(MARKDOWN_PAGES[pathname], {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "x-markdown-tokens": String(Math.ceil(MARKDOWN_PAGES[pathname].length / 4)),
      },
    });
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (MARKETING_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  if (!hasSessionCookie(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.svg|health).*)"],
};
