import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const CACHE_PATH = join(tmpdir(), "clawnitor-cache.json");

interface CachedEntry {
  payload: {
    event_id: string;
    agent_id: string;
    session_id: string;
    event_type: string;
    action: string;
    target?: string;
    timestamp: string;
    severity_hint?: string;
    plugin_version?: string;
    metadata?: Record<string, unknown>;
  };
  created_at: number;
}

function readCache(): CachedEntry[] {
  try {
    if (!existsSync(CACHE_PATH)) return [];
    const raw = readFileSync(CACHE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// The dashboard HTML is a self-contained single page.
// All user-provided data is rendered via textContent (not innerHTML)
// to prevent XSS from event data.
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clawnitor — Local Dashboard</title>
  <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Satoshi', sans-serif; background: #111111; color: #e5e5e5; min-height: 100vh; }
    .header { padding: 20px 32px; border-bottom: 1px solid #222; display: flex; align-items: center; gap: 12px; }
    .header h1 { font-size: 18px; font-weight: 700; color: #FF6B4A; }
    .header .badge { font-size: 11px; background: #222; color: #999; padding: 3px 8px; border-radius: 4px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; padding: 24px 32px; }
    .stat { background: #1a1a1a; border-radius: 8px; padding: 16px; border: 1px solid #222; }
    .stat-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 28px; font-weight: 700; margin-top: 4px; }
    .coral { color: #FF6B4A; }
    .green { color: #4ADE80; }
    .sky { color: #38BDF8; }
    .purple { color: #A78BFA; }
    .content { display: grid; grid-template-columns: 1fr 300px; gap: 0; min-height: calc(100vh - 200px); }
    .feed { padding: 24px 32px; overflow-y: auto; max-height: calc(100vh - 200px); }
    .feed h2 { font-size: 14px; color: #888; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
    .event { background: #1a1a1a; border-radius: 6px; padding: 12px 16px; margin-bottom: 8px; border: 1px solid #222; display: flex; align-items: center; gap: 12px; }
    .event:hover { border-color: #333; }
    .event-type { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; white-space: nowrap; }
    .type-tool_use { background: #1e3a5f; color: #38BDF8; }
    .type-llm_request, .type-llm_response { background: #2d1f5e; color: #A78BFA; }
    .type-message { background: #1f3d2e; color: #4ADE80; }
    .type-lifecycle { background: #3d2e1f; color: #FBBF24; }
    .event-action { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .event-time { font-size: 11px; color: #666; white-space: nowrap; }
    .event-blocked { border-left: 3px solid #FF6B4A; }
    .event-blocked .event-action { text-decoration: line-through; color: #888; }
    .badge-sm { font-size: 9px; color: white; padding: 1px 5px; border-radius: 3px; font-weight: 700; margin-left: 6px; }
    .badge-blocked { background: #FF6B4A; }
    .badge-error { background: #EF4444; }
    .sidebar { border-left: 1px solid #222; padding: 24px; overflow-y: auto; max-height: calc(100vh - 200px); }
    .sidebar h2 { font-size: 14px; color: #888; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
    .agent-item { background: #1a1a1a; border-radius: 6px; padding: 10px 14px; margin-bottom: 8px; border: 1px solid #222; }
    .agent-name { font-size: 13px; font-weight: 600; }
    .agent-count { font-size: 11px; color: #888; margin-top: 2px; }
    .shield-section { margin-top: 24px; }
    .shield-item { font-size: 12px; color: #ddd; padding: 4px 0; display: flex; justify-content: space-between; }
    .shield-cat { color: #888; }
    .empty { text-align: center; padding: 60px 20px; color: #555; }
    .empty p { font-size: 14px; margin-top: 8px; }
    .refresh-bar { padding: 8px 32px; background: #0a0a0a; border-bottom: 1px solid #222; font-size: 11px; color: #555; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Clawnitor</h1>
    <span class="badge">LOCAL MODE</span>
  </div>
  <div class="refresh-bar">
    <span id="event-count">Loading...</span>
    <span id="last-refresh"></span>
  </div>
  <div class="stats" id="stats"></div>
  <div class="content">
    <div class="feed" id="feed"><div class="empty"><h2>Loading...</h2></div></div>
    <div class="sidebar" id="sidebar"></div>
  </div>

  <script>
    // All rendering uses DOM APIs (createElement/textContent) — no innerHTML with user data

    async function refresh() {
      try {
        const [eventsRes, statsRes] = await Promise.all([
          fetch('/api/events'),
          fetch('/api/stats')
        ]);
        const events = await eventsRes.json();
        const stats = await statsRes.json();
        renderStats(stats);
        renderFeed(events);
        renderSidebar(stats);
        document.getElementById('last-refresh').textContent = 'Updated ' + new Date().toLocaleTimeString();
        document.getElementById('event-count').textContent = events.length + ' events';
      } catch (err) {
        console.error('Refresh failed:', err);
      }
    }

    function renderStats(s) {
      const container = document.getElementById('stats');
      container.replaceChildren();
      const items = [
        ['Events', s.totalEvents || 0, 'sky'],
        ['Blocked', s.blockedCount || 0, 'coral'],
        ['Shield', s.shieldCount || 0, 'purple'],
        ['Agents', s.agentCount || 0, 'green'],
        ['Spend', '$' + (s.totalSpend || 0).toFixed(2), ''],
        ['Errors', s.errorCount || 0, ''],
      ];
      for (const [label, value, color] of items) {
        const stat = document.createElement('div');
        stat.className = 'stat';
        const lbl = document.createElement('div');
        lbl.className = 'stat-label';
        lbl.textContent = label;
        const val = document.createElement('div');
        val.className = 'stat-value' + (color ? ' ' + color : '');
        val.textContent = String(value);
        stat.append(lbl, val);
        container.appendChild(stat);
      }
    }

    function renderFeed(events) {
      const feed = document.getElementById('feed');
      feed.replaceChildren();
      if (events.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        const h = document.createElement('h2');
        h.textContent = 'No events yet';
        const p = document.createElement('p');
        p.textContent = 'Run an agent with the Clawnitor plugin to see events here.';
        empty.append(h, p);
        feed.appendChild(empty);
        return;
      }
      const title = document.createElement('h2');
      title.textContent = 'Activity Feed';
      feed.appendChild(title);
      const sorted = [...events].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      for (const e of sorted.slice(0, 200)) {
        const isBlocked = e.metadata && e.metadata.blocked === true;
        const isError = e.metadata && e.metadata.error;
        const row = document.createElement('div');
        row.className = 'event' + (isBlocked ? ' event-blocked' : '');
        const typeBadge = document.createElement('span');
        typeBadge.className = 'event-type type-' + (e.event_type || 'lifecycle');
        typeBadge.textContent = e.event_type || 'unknown';
        const action = document.createElement('span');
        action.className = 'event-action';
        action.textContent = e.action || '—';
        if (isBlocked) {
          const b = document.createElement('span');
          b.className = 'badge-sm badge-blocked';
          b.textContent = 'BLOCKED';
          action.appendChild(b);
        }
        if (isError) {
          const b = document.createElement('span');
          b.className = 'badge-sm badge-error';
          b.textContent = 'ERROR';
          action.appendChild(b);
        }
        const time = document.createElement('span');
        time.className = 'event-time';
        time.textContent = new Date(e.timestamp).toLocaleTimeString();
        row.append(typeBadge, action, time);
        feed.appendChild(row);
      }
    }

    function renderSidebar(s) {
      const sidebar = document.getElementById('sidebar');
      sidebar.replaceChildren();
      // Agents
      const agentTitle = document.createElement('h2');
      agentTitle.textContent = 'Agents';
      sidebar.appendChild(agentTitle);
      const agentEntries = Object.entries(s.agents || {});
      if (agentEntries.length === 0) {
        const p = document.createElement('p');
        p.style.cssText = 'color:#555;font-size:12px';
        p.textContent = 'No agents seen';
        sidebar.appendChild(p);
      } else {
        for (const [name, count] of agentEntries) {
          const item = document.createElement('div');
          item.className = 'agent-item';
          const n = document.createElement('div');
          n.className = 'agent-name';
          n.textContent = name;
          const c = document.createElement('div');
          c.className = 'agent-count';
          c.textContent = count + ' events';
          item.append(n, c);
          sidebar.appendChild(item);
        }
      }
      // Shield
      const shieldSection = document.createElement('div');
      shieldSection.className = 'shield-section';
      const shieldTitle = document.createElement('h2');
      shieldTitle.textContent = 'Shield Detections';
      shieldSection.appendChild(shieldTitle);
      const shieldEntries = Object.entries(s.shieldCategories || {});
      if (shieldEntries.length === 0) {
        const p = document.createElement('p');
        p.style.cssText = 'color:#555;font-size:12px';
        p.textContent = 'No detections';
        shieldSection.appendChild(p);
      } else {
        for (const [cat, count] of shieldEntries) {
          const item = document.createElement('div');
          item.className = 'shield-item';
          const catSpan = document.createElement('span');
          catSpan.className = 'shield-cat';
          catSpan.textContent = cat;
          const countSpan = document.createElement('span');
          countSpan.textContent = String(count);
          item.append(catSpan, countSpan);
          shieldSection.appendChild(item);
        }
      }
      sidebar.appendChild(shieldSection);
    }

    refresh();
    setInterval(refresh, 3000);
  </script>
</body>
</html>`;

export async function serve() {
  const port = parseInt(process.argv[3] || "5173", 10);

  let Fastify: any;
  try {
    Fastify = (await import("fastify")).default;
  } catch {
    console.error("\n  Error: fastify is required for local dashboard. Run: npm install fastify\n");
    process.exit(1);
  }

  const app = Fastify({ logger: false });

  app.get("/", (_req: any, reply: any) => {
    reply.type("text/html").send(DASHBOARD_HTML);
  });

  app.get("/api/events", (_req: any, reply: any) => {
    const entries = readCache();
    reply.send(entries.map((e) => e.payload));
  });

  app.get("/api/stats", (_req: any, reply: any) => {
    const entries = readCache();
    const events = entries.map((e) => e.payload);

    const agents: Record<string, number> = {};
    let blockedCount = 0;
    let shieldCount = 0;
    let errorCount = 0;
    let totalSpend = 0;
    const shieldCategories: Record<string, number> = {};

    for (const e of events) {
      agents[e.agent_id] = (agents[e.agent_id] || 0) + 1;
      if (e.metadata?.blocked) {
        blockedCount++;
        if (e.metadata?.block_source === "shield") {
          shieldCount++;
          const cat = (e.metadata?.shield_category as string) || "unknown";
          shieldCategories[cat] = (shieldCategories[cat] || 0) + 1;
        }
      }
      if (e.metadata?.error) errorCount++;
      if (typeof e.metadata?.cost_usd === "number") totalSpend += e.metadata.cost_usd;
    }

    reply.send({
      totalEvents: events.length,
      blockedCount,
      shieldCount,
      errorCount,
      agentCount: Object.keys(agents).length,
      totalSpend,
      agents,
      shieldCategories,
    });
  });

  try {
    await app.listen({ port, host: "127.0.0.1" });
    console.log(`
  Clawnitor Local Dashboard
  ${"━".repeat(40)}
  Running at http://localhost:${port}

  Reading events from: ${CACHE_PATH}
  Auto-refreshes every 3 seconds.

  Press Ctrl+C to stop.
`);
  } catch (err: any) {
    console.error(`\n  Failed to start: ${err.message}\n`);
    process.exit(1);
  }
}
