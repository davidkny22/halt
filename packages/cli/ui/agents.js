import { el, api, TYPE_LABELS } from './app.js';

export async function renderAgents(container, selectedId) {
  container.replaceChildren();

  if (selectedId) {
    await renderAgentDetail(container, selectedId);
    return;
  }

  const hdr = el('div','page-hdr');
  hdr.appendChild(el('h2','','Agents'));
  hdr.appendChild(el('p','','Agents seen in local events. Click for details.'));
  container.appendChild(hdr);

  try {
    const agents = await api('/agents');

    if (agents.length === 0) {
      const empty = el('div','empty');
      empty.appendChild(el('h2','','No agents yet'));
      empty.appendChild(el('p','','Run an agent with the Halt plugin to see agents here.'));
      container.appendChild(empty);
      return;
    }

    const grid = el('div','agent-grid');
    for (const a of agents.sort((x,y) => y.count - x.count)) {
      const card = el('div','agent-card');
      card.addEventListener('click', () => { location.hash = '#/agents/' + encodeURIComponent(a.id); });

      const h = el('h3','',a.id);
      card.appendChild(h);

      const stats = [
        ['Events', a.count],
        ['Blocked', a.blocked],
        ['Errors', a.errors],
        ['Spend', '$' + a.spend.toFixed(2)],
        ['Last seen', new Date(a.lastSeen).toLocaleTimeString()],
      ];
      for (const [label, value] of stats) {
        const row = el('div','agent-stat');
        row.appendChild(el('span','',label));
        const v = el('span','',String(value));
        if (label==='Blocked' && value>0) v.style.color='var(--coral)';
        if (label==='Errors' && value>0) v.style.color='var(--red)';
        row.appendChild(v);
        card.appendChild(row);
      }

      // Auto-kill status
      const akRow = el('div','agent-stat');
      akRow.style.marginTop = '6px';
      akRow.appendChild(el('span','','Auto-kill'));
      const akVal = el('span','', a.config.auto_kill_enabled ?
        'On (' + a.config.auto_kill_threshold + ' violations / ' + a.config.auto_kill_window_minutes + 'min)' :
        'Off');
      akVal.style.color = a.config.auto_kill_enabled ? 'var(--coral)' : 'var(--text-3)';
      akRow.appendChild(akVal);
      card.appendChild(akRow);

      grid.appendChild(card);
    }
    container.appendChild(grid);
  } catch (err) {
    container.appendChild(el('div','empty'));
    container.lastChild.appendChild(el('p','','Error: ' + err.message));
  }
}

async function renderAgentDetail(container, agentId) {
  const hdr = el('div','page-hdr');
  const back = el('span','agent-back','\u2190 All Agents');
  back.addEventListener('click', () => { location.hash = '#/agents'; });
  hdr.appendChild(back);
  hdr.appendChild(el('h2','',agentId));
  container.appendChild(hdr);

  try {
    const data = await api('/agents/' + encodeURIComponent(agentId));
    const events = data.events || [];
    const config = data.config;

    // Stats
    let blocked = 0, errors = 0, spend = 0;
    for (const e of events) {
      if (e.metadata?.blocked) blocked++;
      if (e.metadata?.error) errors++;
      if (typeof e.metadata?.cost_usd === 'number') spend += e.metadata.cost_usd;
    }

    const statsRow = el('div','stats');
    statsRow.style.gridTemplateColumns = 'repeat(5,1fr)';
    const statItems = [
      ['Events', events.length, 'var(--sky)'],
      ['Blocked', blocked, 'var(--coral)'],
      ['Errors', errors, errors>0?'var(--red)':'var(--text)'],
      ['Spend', '$'+spend.toFixed(2), 'var(--text)'],
      ['Last seen', events.length>0 ? new Date(events.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))[0].timestamp).toLocaleTimeString() : 'N/A', 'var(--text-2)'],
    ];
    for (const [label, value, color] of statItems) {
      const s = el('div','stat');
      s.appendChild(el('div','stat-l',label));
      const v = el('div','stat-v',value); v.style.color=color; v.style.fontSize='18px'; s.appendChild(v);
      statsRow.appendChild(s);
    }
    container.appendChild(statsRow);

    // Auto-kill config
    const akForm = el('div','ak-form');
    akForm.style.margin = '0 24px';
    akForm.appendChild(el('h3','','Auto-Kill Settings'));

    // Enabled toggle
    const enabledRow = el('div','ak-row');
    enabledRow.appendChild(el('label','','Enabled'));
    const toggle = el('div', 'toggle' + (config.auto_kill_enabled ? ' on' : ''));
    toggle.addEventListener('click', async () => {
      config.auto_kill_enabled = !config.auto_kill_enabled;
      toggle.classList.toggle('on');
      await api('/agents/' + encodeURIComponent(agentId) + '/config', {
        method: 'POST', body: { auto_kill_enabled: config.auto_kill_enabled }
      });
    });
    enabledRow.appendChild(toggle);
    akForm.appendChild(enabledRow);

    // Threshold
    const threshRow = el('div','ak-row');
    threshRow.appendChild(el('label','','Threshold'));
    const threshInput = el('input','');
    threshInput.type = 'number'; threshInput.min = '2'; threshInput.max = '50';
    threshInput.value = config.auto_kill_threshold;
    threshInput.addEventListener('change', async () => {
      const val = parseInt(threshInput.value);
      if (val >= 2 && val <= 50) {
        await api('/agents/' + encodeURIComponent(agentId) + '/config', {
          method: 'POST', body: { auto_kill_threshold: val }
        });
      }
    });
    threshRow.appendChild(threshInput);
    threshRow.appendChild(el('span','', 'violations'));
    threshRow.lastChild.style.cssText = 'font-size:11px;color:var(--text-3)';
    akForm.appendChild(threshRow);

    // Window
    const winRow = el('div','ak-row');
    winRow.appendChild(el('label','','Window'));
    const winSel = el('select','');
    for (const mins of [5,10,15,30,60]) {
      const opt = el('option','', mins + ' min'); opt.value = mins;
      if (config.auto_kill_window_minutes === mins) opt.selected = true;
      winSel.appendChild(opt);
    }
    winSel.addEventListener('change', async () => {
      await api('/agents/' + encodeURIComponent(agentId) + '/config', {
        method: 'POST', body: { auto_kill_window_minutes: parseInt(winSel.value) }
      });
    });
    winRow.appendChild(winSel);
    akForm.appendChild(winRow);

    container.appendChild(akForm);

    // Recent events
    const feedHdr = el('div','page-hdr');
    feedHdr.style.marginTop = '8px';
    feedHdr.appendChild(el('h2','','Recent Events'));
    container.appendChild(feedHdr);

    const feedContainer = el('div','');
    const sorted = [...events].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);
    if (sorted.length === 0) {
      feedContainer.appendChild(el('div','empty'));
      feedContainer.lastChild.appendChild(el('p','','No events for this agent.'));
    } else {
      for (const e of sorted) {
        const isBlocked = e.metadata?.blocked === true;
        const hasError = !!e.metadata?.error;
        const sev = e.severity_hint || 'normal';

        const row = el('div','ev');
        if (isBlocked) row.classList.add('blocked');
        else if (sev==='critical') row.classList.add('critical');
        else if (sev==='elevated') row.classList.add('elevated');
        else if (hasError) row.classList.add('has-error');

        row.appendChild(el('span','ev-time', new Date(e.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})));
        row.appendChild(el('span','ev-type t-'+(e.event_type||'agent_lifecycle'), TYPE_LABELS[e.event_type]||e.event_type));
        if (e.metadata?.shield_detection) row.appendChild(el('span','ev-badge b-shield','SHIELD'));
        else if (isBlocked) row.appendChild(el('span','ev-badge b-blocked','BLOCKED'));
        if (hasError && !isBlocked) row.appendChild(el('span','ev-badge b-error','ERROR'));
        row.appendChild(el('span', isBlocked?'ev-action struck':'ev-action', e.action||'\u2014'));
        if (e.metadata?.cost_usd > 0) {
          const cv = el('span','ev-cost','$'+e.metadata.cost_usd.toFixed(4));
          if (e.metadata.cost_usd > 0.5) cv.classList.add('high');
          row.appendChild(cv);
        }

        feedContainer.appendChild(row);
      }
    }
    container.appendChild(feedContainer);

  } catch (err) {
    container.appendChild(el('div','empty'));
    container.lastChild.appendChild(el('p','','Error: ' + err.message));
  }
}
