import { el, api } from './app.js';

let showCreateForm = false;
let showTemplates = false;
let activeCategory = 'security';
let installedTemplates = new Set();

function describeRule(rule) {
  const c = rule.config || {};
  switch (rule.rule_type) {
    case 'keyword': return 'Match: ' + (c.keywords||[]).join(', ') + ' (' + (c.matchMode||'any') + ')';
    case 'rate': return (c.toolName ? c.toolName + ': ' : '') + 'max ' + c.maxCount + ' in ' + c.windowMinutes + 'min';
    case 'threshold': return c.field + ' ' + (c.operator||'>') + ' ' + c.value + ' over ' + c.windowMinutes + 'min';
    default: return JSON.stringify(c);
  }
}

function renderRuleCard(rule, onDelete, onToggle) {
  const card = el('div', 'rule-card' + (rule.enabled ? '' : ' disabled'));

  // Type badge
  card.appendChild(el('span', 'rule-type rt-' + rule.rule_type, rule.rule_type));

  // Action badge
  card.appendChild(el('span', 'rule-action ra-' + rule.action_mode, rule.action_mode));

  // Name
  card.appendChild(el('span', 'rule-name', rule.name));

  // Config description
  card.appendChild(el('span', 'rule-config', describeRule(rule)));

  // Buttons
  const btns = el('div', 'rule-btns');
  const toggleBtn = el('button', 'rule-btn', rule.enabled ? 'Disable' : 'Enable');
  toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); onToggle(rule.id); });
  btns.appendChild(toggleBtn);
  const delBtn = el('button', 'rule-btn danger', 'Delete');
  delBtn.addEventListener('click', (e) => { e.stopPropagation(); onDelete(rule.id); });
  btns.appendChild(delBtn);
  card.appendChild(btns);

  return card;
}

function renderCreateModal(onClose, onCreated) {
  const overlay = el('div', 'form-overlay');
  overlay.addEventListener('click', (e) => { if (e.target === overlay) onClose(); });

  const modal = el('div', 'form-modal');
  modal.appendChild(el('h2', '', 'Create Rule'));

  let ruleType = 'keyword';
  let actionMode = 'block';
  const state = { name: '', config: {} };

  // Name
  const nameGroup = el('div', 'form-group');
  nameGroup.appendChild(el('label', 'form-label', 'Rule Name'));
  const nameInput = el('input', 'form-input');
  nameInput.placeholder = 'e.g. Block destructive commands';
  nameInput.addEventListener('input', () => { state.name = nameInput.value; });
  nameGroup.appendChild(nameInput);
  modal.appendChild(nameGroup);

  // Type
  const typeGroup = el('div', 'form-group');
  typeGroup.appendChild(el('label', 'form-label', 'Rule Type'));
  const typeBtns = el('div', 'btn-group');
  for (const t of ['keyword', 'rate', 'threshold']) {
    const btn = el('button', 'btn-opt' + (ruleType === t ? ' on' : ''), t);
    btn.addEventListener('click', () => {
      ruleType = t;
      typeBtns.querySelectorAll('.btn-opt').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      renderTypeFields();
    });
    typeBtns.appendChild(btn);
  }
  typeGroup.appendChild(typeBtns);
  modal.appendChild(typeGroup);

  // Action mode
  const actionGroup = el('div', 'form-group');
  actionGroup.appendChild(el('label', 'form-label', 'Action'));
  const actionBtns = el('div', 'btn-group');
  for (const a of ['block', 'alert', 'both']) {
    const btn = el('button', 'btn-opt' + (actionMode === a ? ' on' : ''), a);
    btn.addEventListener('click', () => {
      actionMode = a;
      actionBtns.querySelectorAll('.btn-opt').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
    });
    actionBtns.appendChild(btn);
  }
  actionGroup.appendChild(actionBtns);
  modal.appendChild(actionGroup);

  // Type-specific fields container
  const fieldsContainer = el('div', '');
  fieldsContainer.id = 'type-fields';
  modal.appendChild(fieldsContainer);

  function renderTypeFields() {
    fieldsContainer.replaceChildren();
    state.config = {};

    if (ruleType === 'keyword') {
      const g = el('div', 'form-group');
      g.appendChild(el('label', 'form-label', 'Keywords (comma-separated)'));
      const inp = el('input', 'form-input');
      inp.placeholder = 'rm -rf, DROP TABLE, sudo';
      inp.addEventListener('input', () => { state.config.keywords = inp.value.split(',').map(s => s.trim()).filter(Boolean); });
      g.appendChild(inp);
      fieldsContainer.appendChild(g);

      const matchGroup = el('div', 'form-group');
      matchGroup.appendChild(el('label', 'form-label', 'Match Mode'));
      const matchBtns = el('div', 'btn-group');
      state.config.matchMode = 'any';
      state.config.caseSensitive = false;
      for (const m of ['any', 'all']) {
        const btn = el('button', 'btn-opt' + (m === 'any' ? ' on' : ''), m);
        btn.addEventListener('click', () => {
          state.config.matchMode = m;
          matchBtns.querySelectorAll('.btn-opt').forEach(b => b.classList.remove('on'));
          btn.classList.add('on');
        });
        matchBtns.appendChild(btn);
      }
      matchGroup.appendChild(matchBtns);
      fieldsContainer.appendChild(matchGroup);

    } else if (ruleType === 'rate') {
      const row = el('div', 'form-row');
      const g1 = el('div', 'form-group');
      g1.appendChild(el('label', 'form-label', 'Max Count'));
      const maxInp = el('input', 'form-input'); maxInp.type = 'number'; maxInp.value = '10'; maxInp.min = '1';
      maxInp.addEventListener('input', () => { state.config.maxCount = parseInt(maxInp.value); });
      state.config.maxCount = 10;
      g1.appendChild(maxInp);
      row.appendChild(g1);

      const g2 = el('div', 'form-group');
      g2.appendChild(el('label', 'form-label', 'Window (minutes)'));
      const winInp = el('input', 'form-input'); winInp.type = 'number'; winInp.value = '60'; winInp.min = '1';
      winInp.addEventListener('input', () => { state.config.windowMinutes = parseInt(winInp.value); });
      state.config.windowMinutes = 60;
      g2.appendChild(winInp);
      row.appendChild(g2);
      fieldsContainer.appendChild(row);

      const g3 = el('div', 'form-group');
      g3.appendChild(el('label', 'form-label', 'Tool Name (optional)'));
      const toolInp = el('input', 'form-input'); toolInp.placeholder = 'e.g. send_email';
      toolInp.addEventListener('input', () => { if (toolInp.value) state.config.toolName = toolInp.value; else delete state.config.toolName; });
      g3.appendChild(toolInp);
      fieldsContainer.appendChild(g3);

    } else if (ruleType === 'threshold') {
      const row = el('div', 'form-row');
      const g1 = el('div', 'form-group');
      g1.appendChild(el('label', 'form-label', 'Field'));
      const fieldSel = el('select', 'form-input');
      for (const f of ['cost_usd', 'tokens_used', 'duration_ms']) {
        const opt = el('option', '', f); opt.value = f; fieldSel.appendChild(opt);
      }
      state.config.field = 'cost_usd';
      fieldSel.addEventListener('change', () => { state.config.field = fieldSel.value; });
      g1.appendChild(fieldSel);
      row.appendChild(g1);

      const g2 = el('div', 'form-group');
      g2.appendChild(el('label', 'form-label', 'Operator'));
      const opSel = el('select', 'form-input');
      for (const [v, l] of [['gt', 'Greater than'], ['lt', 'Less than']]) {
        const opt = el('option', '', l); opt.value = v; opSel.appendChild(opt);
      }
      state.config.operator = 'gt';
      opSel.addEventListener('change', () => { state.config.operator = opSel.value; });
      g2.appendChild(opSel);
      row.appendChild(g2);
      fieldsContainer.appendChild(row);

      const row2 = el('div', 'form-row');
      const g3 = el('div', 'form-group');
      g3.appendChild(el('label', 'form-label', 'Value'));
      const valInp = el('input', 'form-input'); valInp.type = 'number'; valInp.value = '25'; valInp.step = '0.01';
      valInp.addEventListener('input', () => { state.config.value = parseFloat(valInp.value); });
      state.config.value = 25;
      g3.appendChild(valInp);
      row2.appendChild(g3);

      const g4 = el('div', 'form-group');
      g4.appendChild(el('label', 'form-label', 'Window (minutes)'));
      const winInp = el('input', 'form-input'); winInp.type = 'number'; winInp.value = '60'; winInp.min = '1';
      winInp.addEventListener('input', () => { state.config.windowMinutes = parseInt(winInp.value); });
      state.config.windowMinutes = 60;
      g4.appendChild(winInp);
      row2.appendChild(g4);
      fieldsContainer.appendChild(row2);
    }
  }

  renderTypeFields();

  // Error display
  const errEl = el('div', '');
  errEl.style.cssText = 'color:var(--red);font-size:12px;margin-top:8px;display:none';
  modal.appendChild(errEl);

  // Actions
  const actions = el('div', 'form-actions');
  const cancelBtn = el('button', 'btn btn-secondary', 'Cancel');
  cancelBtn.addEventListener('click', onClose);
  actions.appendChild(cancelBtn);

  const createBtn = el('button', 'btn btn-primary', 'Create Rule');
  createBtn.addEventListener('click', async () => {
    if (!state.name.trim()) { errEl.textContent = 'Name is required'; errEl.style.display = 'block'; return; }
    createBtn.textContent = 'Creating...';
    createBtn.disabled = true;
    try {
      await api('/rules', {
        method: 'POST',
        body: { name: state.name, rule_type: ruleType, config: state.config, action_mode: actionMode, enabled: true }
      });
      onCreated();
    } catch (err) {
      errEl.textContent = 'Error: ' + err.message;
      errEl.style.display = 'block';
      createBtn.textContent = 'Create Rule';
      createBtn.disabled = false;
    }
  });
  actions.appendChild(createBtn);
  modal.appendChild(actions);

  overlay.appendChild(modal);
  return overlay;
}

export async function renderRules(container) {
  container.replaceChildren();

  const bar = el('div', 'rules-bar');
  const barLeft = el('div','');
  barLeft.appendChild(el('h2', '', 'Rules'));
  bar.appendChild(barLeft);
  const createBtn = el('button', 'btn btn-primary', '+ Create Rule');
  createBtn.addEventListener('click', () => {
    const modal = renderCreateModal(
      () => modal.remove(),
      () => { modal.remove(); renderRules(container); }
    );
    document.body.appendChild(modal);
  });
  bar.appendChild(createBtn);
  container.appendChild(bar);

  try {
    const rules = await api('/rules');
    const list = el('div', 'rules-list');

    if (rules.length === 0) {
      const empty = el('div', 'empty');
      empty.appendChild(el('h2', '', 'No rules configured'));
      empty.appendChild(el('p', '', 'Create a rule or install a template below.'));
      list.appendChild(empty);
    } else {
      for (const rule of rules) {
        list.appendChild(renderRuleCard(
          rule,
          async (id) => {
            if (confirm('Delete rule "' + rule.name + '"?')) {
              await api('/rules/' + id, { method: 'DELETE' });
              renderRules(container);
            }
          },
          async (id) => {
            await api('/rules/' + id + '/toggle', { method: 'POST' });
            renderRules(container);
          }
        ));
      }
    }
    container.appendChild(list);

    // Templates
    const tplSection = el('div', 'tpl-section');
    const tplHeader = el('div', 'tpl-header', (showTemplates ? '\u25BC' : '\u25B6') + ' Rule Templates (' + (showTemplates ? 'collapse' : '19 templates') + ')');
    tplHeader.addEventListener('click', () => { showTemplates = !showTemplates; renderRules(container); });
    tplSection.appendChild(tplHeader);

    if (showTemplates) {
      const templates = await api('/templates');
      const CATEGORY_LABELS = { security: 'Shield', safety: 'Safety', cost: 'Cost Control', communication: 'Communication', compliance: 'Compliance' };
      const CATEGORY_ORDER = ['security', 'safety', 'cost', 'communication', 'compliance'];
      const grouped = {};
      for (const tpl of templates) {
        const cat = tpl.category || 'other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(tpl);
      }

      // Category tabs
      const tabBar = el('div', 'btn-group');
      tabBar.style.marginBottom = '12px';
      for (const cat of CATEGORY_ORDER) {
        if (!grouped[cat]) continue;
        const btn = el('button', 'btn-opt' + (activeCategory === cat ? ' on' : ''),
          (CATEGORY_LABELS[cat] || cat) + ' (' + grouped[cat].length + ')');
        btn.addEventListener('click', () => { activeCategory = cat; renderRules(container); });
        tabBar.appendChild(btn);
      }
      tplSection.appendChild(tabBar);

      const catTemplates = grouped[activeCategory] || [];
      const grid = el('div', 'tpl-grid');

      for (const tpl of catTemplates) {
        const card = el('div', 'tpl-card');
        const top = el('div', 'tpl-card-top');
        const sevColors = { critical: 'var(--red)', high: 'var(--coral)', medium: 'var(--sky)', low: 'var(--green)' };
        const sevBadge = el('span', 'ev-badge', tpl.severity || 'medium');
        sevBadge.style.background = sevColors[tpl.severity] || 'var(--text-3)';
        top.appendChild(sevBadge);
        top.appendChild(el('span', 'rule-type rt-' + tpl.rule_type, tpl.rule_type));
        top.appendChild(el('span', 'tpl-name', tpl.name));
        card.appendChild(top);
        card.appendChild(el('div', 'tpl-desc', tpl.description));

        const isInstalled = installedTemplates.has(tpl.id) || rules.some(r => r.name === tpl.name);
        const addBtn = el('button', 'tpl-add' + (isInstalled ? ' done' : ''), isInstalled ? 'Added' : 'Add');
        if (!isInstalled) {
          addBtn.addEventListener('click', async () => {
            addBtn.textContent = 'Adding...';
            await api('/rules', {
              method: 'POST',
              body: { name: tpl.name, rule_type: tpl.rule_type, config: tpl.config, action_mode: tpl.action_mode, enabled: true }
            });
            installedTemplates.add(tpl.id);
            addBtn.textContent = 'Added';
            addBtn.classList.add('done');
            renderRules(container);
          });
        }
        card.appendChild(addBtn);
        grid.appendChild(card);
      }
      tplSection.appendChild(grid);
    }
    container.appendChild(tplSection);

  } catch (err) {
    container.appendChild(el('div','empty'));
    container.lastChild.appendChild(el('p','','Error: ' + err.message));
  }
}
