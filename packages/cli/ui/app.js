import { renderDashboard } from './dashboard.js';
import { renderAgents } from './agents.js';
import { renderRules } from './rules.js';

// --- DOM helpers ---
export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = String(text);
  return e;
}

export function svg(cls) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '2');
  if (cls) s.classList.add(cls);
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  p.setAttribute('points', '6 9 12 15 18 9');
  s.appendChild(p);
  return s;
}

export const TYPE_LABELS = {
  tool_use: 'tool', llm_call: 'llm', message_sent: 'msg out',
  message_received: 'msg in', agent_lifecycle: 'lifecycle', subagent: 'subagent'
};
export const RANGE_MS = { '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000 };

// --- API helpers ---
export async function api(path, opts) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  return res.json();
}

// --- Router ---
const app = document.getElementById('app');
const navLinks = document.querySelectorAll('.nav-link');
let currentPage = null;
let refreshTimer = null;

function route() {
  const hash = location.hash || '#/';
  const path = hash.slice(1) || '/';

  navLinks.forEach(l => {
    const page = l.dataset.page;
    l.classList.toggle('active',
      (page === 'dashboard' && (path === '/' || path === '/dashboard')) ||
      (page === 'agents' && path.startsWith('/agents')) ||
      (page === 'rules' && path === '/rules')
    );
  });

  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
  app.replaceChildren();

  if (path === '/' || path === '/dashboard') {
    currentPage = 'dashboard';
    renderDashboard(app);
    refreshTimer = setInterval(() => renderDashboard(app, true), 3000);
  } else if (path.startsWith('/agents')) {
    currentPage = 'agents';
    const agentId = path.startsWith('/agents/') ? decodeURIComponent(path.slice(8)) : null;
    renderAgents(app, agentId);
  } else if (path === '/rules') {
    currentPage = 'rules';
    renderRules(app);
  } else {
    app.appendChild(el('div', 'empty', 'Page not found'));
  }
}

window.addEventListener('hashchange', route);
route();
