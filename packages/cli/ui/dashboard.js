import { el, svg, api, TYPE_LABELS, RANGE_MS } from './app.js';

let timeRange = 'all';
let sortBy = 'newest';
let expandedIds = new Set();
let visibleCount = 50;
let lastEvents = [];
let lastStats = null;

function filterAndSort(events) {
  const now = Date.now();
  let filtered = timeRange === 'all' ? events :
    events.filter(e => now - new Date(e.timestamp).getTime() < RANGE_MS[timeRange]);
  return [...filtered].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.timestamp) - new Date(a.timestamp);
    if (sortBy === 'oldest') return new Date(a.timestamp) - new Date(b.timestamp);
    if (sortBy === 'errors') {
      const sa = (a.metadata?.blocked?2:0)+(a.metadata?.error?1:0)+(a.severity_hint!=='normal'?1:0);
      const sb = (b.metadata?.blocked?2:0)+(b.metadata?.error?1:0)+(b.severity_hint!=='normal'?1:0);
      return sb-sa || new Date(b.timestamp)-new Date(a.timestamp);
    }
    if (sortBy === 'cost') return (b.metadata?.cost_usd||0)-(a.metadata?.cost_usd||0);
    return 0;
  });
}

function renderStats(container, stats) {
  container.replaceChildren();
  const items = [
    ['Events', stats.totalEvents||0, 'var(--sky)'],
    ['Blocked', stats.blocked||0, 'var(--coral)'],
    ['Shield', stats.shield||0, 'var(--purple)'],
    ['Agents', Object.keys(stats.agents||{}).length, 'var(--green)'],
    ['Spend', '$'+(stats.spend||0).toFixed(2), 'var(--text)'],
    ['Errors', stats.errors||0, (stats.errors||0)>0?'var(--red)':'var(--text)'],
  ];
  for (const [label, value, color] of items) {
    const s = el('div','stat');
    s.appendChild(el('div','stat-l',label));
    const v = el('div','stat-v',value);
    v.style.color = color;
    s.appendChild(v);
    container.appendChild(s);
  }
}

function renderFeed(container, events) {
  container.replaceChildren();
  const filtered = filterAndSort(events);

  // Toolbar
  const bar = el('div','feed-bar');
  const barL = el('div','feed-bar-l');
  barL.appendChild(el('span','feed-title','Activity'));
  barL.appendChild(el('span','feed-count', filtered.length + ' events'));
  const barR = el('div','feed-bar-r');
  for (const [val, label] of [['all','All'],['1h','1h'],['6h','6h'],['24h','24h'],['7d','7d']]) {
    const btn = el('button', 'pill' + (timeRange===val?' on':''), label);
    btn.addEventListener('click', () => { timeRange=val; visibleCount=50; renderFeed(container, events); });
    barR.appendChild(btn);
  }
  const sel = el('select','sel');
  for (const [v,l] of [['newest','Newest'],['oldest','Oldest'],['errors','Errors first'],['cost','Highest cost']]) {
    const opt = el('option','',l); opt.value = v; if(sortBy===v) opt.selected=true; sel.appendChild(opt);
  }
  sel.addEventListener('change', () => { sortBy=sel.value; renderFeed(container, events); });
  barR.appendChild(sel);
  bar.append(barL, barR);
  container.appendChild(bar);

  // Events
  const feed = el('div','');
  if (filtered.length === 0) {
    const empty = el('div','empty');
    empty.appendChild(el('h2','','No events yet'));
    empty.appendChild(el('p','','Run an agent with the halt plugin to see events here.'));
    empty.appendChild(el('code','','openclaw plugins install @halt/plugin'));
    feed.appendChild(empty);
  } else {
    const visible = filtered.slice(0, visibleCount);
    for (const e of visible) {
      const isBlocked = e.metadata?.blocked === true;
      const isShield = e.metadata?.shield_detection === true;
      const hasError = !!e.metadata?.error;
      const sev = e.severity_hint || 'normal';
      const cost = e.metadata?.cost_usd;
      const isExp = expandedIds.has(e.event_id);

      const row = el('div','ev');
      if (isBlocked) row.classList.add('blocked');
      else if (sev==='critical') row.classList.add('critical');
      else if (sev==='elevated') row.classList.add('elevated');
      else if (hasError) row.classList.add('has-error');

      row.appendChild(el('span','ev-time', new Date(e.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})));
      row.appendChild(el('span','ev-type t-'+(e.event_type||'agent_lifecycle'), TYPE_LABELS[e.event_type]||e.event_type||'event'));
      if (isShield) row.appendChild(el('span','ev-badge b-shield','SHIELD'));
      else if (isBlocked) row.appendChild(el('span','ev-badge b-blocked','BLOCKED'));
      if (hasError && !isBlocked) row.appendChild(el('span','ev-badge b-error','ERROR'));
      row.appendChild(el('span', isBlocked?'ev-action struck':'ev-action', e.action||'\u2014'));
      if (cost != null && cost > 0) {
        const cv = el('span','ev-cost','$'+cost.toFixed(4));
        if (cost > 0.5) cv.classList.add('high');
        row.appendChild(cv);
      }
      const chev = svg('ev-chev');
      if (isExp) chev.classList.add('open');
      row.appendChild(chev);

      // Detail
      const detail = el('div', isExp ? 'ev-detail show' : 'ev-detail');
      const grid = el('div','detail-grid');
      function addR(label, value, cls) {
        if (value == null || value === '') return;
        grid.appendChild(el('span','dl',label));
        grid.appendChild(el('span', cls?'dv '+cls:'dv', String(value)));
      }
      function addPre(label, value) {
        if (!value) return;
        grid.appendChild(el('span','dl',label));
        const w = el('span','dv'); const pre = el('pre','',value); w.appendChild(pre); grid.appendChild(w);
      }
      addR('Action', e.action);
      addR('Target', e.target);
      addR('Timestamp', new Date(e.timestamp).toLocaleString());
      addR('Agent', e.agent_id);
      addR('Session', e.session_id, 'mono');
      if (e.metadata?.subagent_id) addR('Subagent', e.metadata.subagent_id, 'mono');
      if (e.metadata?.tool_name) addR('Tool', e.metadata.tool_name);
      if (cost!=null && cost>0) addR('Cost', '$'+cost.toFixed(6), 'coral');
      if (e.metadata?.tokens_used!=null) addR('Tokens', e.metadata.tokens_used.toLocaleString());
      if (e.metadata?.duration_ms!=null) addR('Duration', e.metadata.duration_ms.toFixed(0)+'ms');
      if (e.metadata?.blocked) addR('Block reason', e.metadata.block_reason||'Action blocked', 'coral');
      if (e.metadata?.block_source) addR('Source', e.metadata.block_source);
      if (isShield) {
        addR('Shield', (e.metadata?.shield_category||'unknown')+' ('+(e.metadata?.shield_severity||'unknown')+')');
        if (e.metadata?.shield_patterns) addR('Patterns', e.metadata.shield_patterns.join(', '));
      }
      if (e.metadata?.error) addR('Error', e.metadata.error, 'coral');
      if (e.metadata?.raw_snippet) addPre('Details', e.metadata.raw_snippet);
      detail.appendChild(grid);

      row.addEventListener('click', () => {
        if (expandedIds.has(e.event_id)) { expandedIds.delete(e.event_id); detail.classList.remove('show'); chev.classList.remove('open'); }
        else { expandedIds.add(e.event_id); detail.classList.add('show'); chev.classList.add('open'); }
      });

      feed.appendChild(row);
      feed.appendChild(detail);
    }
    if (visible.length < filtered.length) {
      const more = el('div','show-more','Show all ' + filtered.length + ' events');
      more.addEventListener('click', () => { visibleCount=filtered.length; renderFeed(container, events); });
      feed.appendChild(more);
    }
  }
  container.appendChild(feed);
}

function renderSidebar(container, stats) {
  container.replaceChildren();

  // Agents
  const agentSec = el('div','sb-sec');
  agentSec.appendChild(el('div','sb-title','Agents'));
  const agentEntries = Object.entries(stats.agents||{});
  if (agentEntries.length === 0) {
    agentSec.appendChild(el('div','sb-empty','No agents seen'));
  } else {
    for (const [name, data] of agentEntries.sort((a,b)=>b[1].count-a[1].count)) {
      const card = el('div','sb-card');
      card.style.cursor = 'pointer';
      const row = el('div','sb-row');
      row.appendChild(el('span','sb-name',name));
      const v = el('span','sb-val',data.count); v.style.color='var(--sky)'; row.appendChild(v);
      card.appendChild(row);
      card.appendChild(el('div','sb-sub', data.spend>0?'$'+data.spend.toFixed(2)+' spent':'No spend data'));
      card.addEventListener('click', () => { location.hash = '#/agents/' + encodeURIComponent(name); });
      agentSec.appendChild(card);
    }
  }
  container.appendChild(agentSec);

  // Shield
  const shieldSec = el('div','sb-sec');
  shieldSec.appendChild(el('div','sb-title','Shield Detections'));
  const shieldEntries = Object.entries(stats.shieldCategories||{});
  if (shieldEntries.length === 0) {
    shieldSec.appendChild(el('div','sb-empty','No detections'));
  } else {
    const sevCard = el('div','sb-card');
    for (const [sev, count] of Object.entries(stats.shieldSeverities||{})) {
      if (!count) continue;
      const row = el('div','sb-row'); row.style.padding='1px 0';
      const left = el('span','');
      left.appendChild(el('span','sb-dot '+sev));
      left.appendChild(document.createTextNode(sev));
      left.style.fontSize='10px';
      row.appendChild(left);
      const sv = el('span','sb-val',count); sv.style.fontSize='10px';
      sv.style.color = sev==='critical'?'var(--red)':sev==='high'?'var(--coral)':'var(--yellow)';
      row.appendChild(sv);
      sevCard.appendChild(row);
    }
    shieldSec.appendChild(sevCard);
    for (const [cat,count] of shieldEntries.sort((a,b)=>b[1]-a[1])) {
      const card = el('div','sb-card');
      const row = el('div','sb-row');
      const n = el('span','sb-name',cat.replace(/_/g,' ')); n.style.fontSize='10px'; n.style.fontWeight='500'; row.appendChild(n);
      const sv = el('span','sb-val',count); sv.style.color='var(--coral)'; sv.style.fontSize='10px'; row.appendChild(sv);
      card.appendChild(row);
      shieldSec.appendChild(card);
    }
  }
  container.appendChild(shieldSec);

  // Severity
  const sevSec = el('div','sb-sec');
  sevSec.appendChild(el('div','sb-title','Severity'));
  const sevMap = { normal:0, elevated:0, critical:0 };
  for (const e of lastEvents) { sevMap[e.severity_hint||'normal']++; }
  const sevCard2 = el('div','sb-card');
  for (const [sev,count] of Object.entries(sevMap)) {
    const row = el('div','sb-row'); row.style.padding='1px 0';
    row.appendChild(el('span','',sev));
    const v = el('span','sb-val',count); v.style.fontSize='10px';
    v.style.color = sev==='critical'?'var(--red)':sev==='elevated'?'var(--yellow)':'var(--text-3)';
    row.appendChild(v);
    sevCard2.appendChild(row);
  }
  sevSec.appendChild(sevCard2);
  container.appendChild(sevSec);
}

export async function renderDashboard(container, isRefresh) {
  try {
    const [events, stats] = await Promise.all([api('/events'), api('/stats')]);
    lastEvents = events;
    lastStats = stats;

    // Update header
    document.getElementById('refresh-info').textContent =
      events.length + ' events \u00b7 ' + new Date().toLocaleTimeString();

    if (!isRefresh) {
      // Full render: build layout
      container.replaceChildren();
      const statsRow = el('div','stats');
      statsRow.id = 'dash-stats';
      container.appendChild(statsRow);

      const layout = el('div','layout');
      const mainCol = el('div','main-col');
      mainCol.id = 'dash-feed';
      const sidebar = el('div','sidebar');
      sidebar.id = 'dash-sidebar';
      layout.append(mainCol, sidebar);
      container.appendChild(layout);
    }

    renderStats(document.getElementById('dash-stats'), stats);
    renderFeed(document.getElementById('dash-feed'), events);
    renderSidebar(document.getElementById('dash-sidebar'), stats);
  } catch (err) {
    if (!isRefresh) {
      container.replaceChildren();
      const empty = el('div','empty');
      empty.appendChild(el('h2','','Connection error'));
      empty.appendChild(el('p','',err.message));
      container.appendChild(empty);
    }
  }
}
