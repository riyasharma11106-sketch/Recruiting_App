/* RR RecruitRight — application tracker
 * Local-first. No external API. State persisted to localStorage.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'rr_recruitright_apps_v1';
  const SEEDED_KEY = 'rr_recruitright_seeded_v1';

  const SEED = [
    { id: id(), company: 'Anthropic',   role: 'AI Product Intern',   field: 'Product / Design',     daysAfter: 3, status: 'Interview', dateApplied: dateOffset(-12) },
    { id: id(), company: 'Google',      role: 'PM Intern',           field: 'Tech / Engineering',   daysAfter: 1, status: 'Screening', dateApplied: dateOffset(-9)  },
    { id: id(), company: 'Meta',        role: 'Product Analyst',     field: 'Tech / Engineering',   daysAfter: 7, status: 'Rejected',  dateApplied: dateOffset(-18) },
    { id: id(), company: 'McKinsey',    role: 'Business Analyst',    field: 'Finance / Consulting', daysAfter: 2, status: 'Applied',   dateApplied: dateOffset(-4)  },
    { id: id(), company: 'Stripe',      role: 'PM Intern',           field: 'Tech / Engineering',   daysAfter: 0, status: 'Offer',     dateApplied: dateOffset(-22) },
  ];

  // ---------- STATE ----------
  let state = {
    apps: load(),
    activeTab: 'log',
  };

  function id() {
    return 'a_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }
  function dateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { /* ignore */ }
    if (!localStorage.getItem(SEEDED_KEY)) {
      localStorage.setItem(SEEDED_KEY, '1');
      save(SEED);
      return SEED.slice();
    }
    return [];
  }
  function save(apps) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(apps || state.apps)); }
    catch (e) { /* ignore */ }
  }

  // ---------- DOM ----------
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------- TABS ----------
  $$('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      if (target === state.activeTab) return;
      state.activeTab = target;
      $$('.tab').forEach(t => {
        const active = t.dataset.tab === target;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      $$('.panel').forEach(p => p.classList.remove('active'));
      const panel = $('#tab-' + target);
      if (panel) panel.classList.add('active');
      if (target === 'funnel') requestAnimationFrame(() => renderFunnel(true));
    });
  });

  // ---------- RENDER ----------
  function render(opts = {}) {
    renderMetrics(opts.pulse);
    renderList();
    renderFunnel(false);
    $('#list-count').textContent = '// ' + state.apps.length + ' logged';
  }

  function renderMetrics(pulse) {
    const total = state.apps.length;
    const responded = state.apps.filter(a => ['Screening','Interview','Offer'].includes(a.status)).length;
    const interviews = state.apps.filter(a => a.status === 'Interview').length;
    const offers = state.apps.filter(a => a.status === 'Offer').length;
    const rate = total ? Math.round((responded / total) * 100) : 0;

    setMetric('total', total, false);
    setMetric('response', rate, true);
    setMetric('interviews', interviews, false);
    setMetric('offers', offers, false);

    if (pulse) {
      $$('.metric').forEach(el => {
        el.classList.remove('pulse');
        // force reflow to restart animation
        void el.offsetWidth;
        el.classList.add('pulse');
      });
    }
  }

  function setMetric(name, value, isPercent) {
    const el = document.querySelector(`.metric[data-metric="${name}"] .metric-value`);
    if (!el) return;
    const prev = Number(el.dataset.target || '0');
    el.dataset.target = String(value);
    countUp(el, prev, value, isPercent);
  }

  function countUp(el, from, to, isPercent) {
    const dur = 600;
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(from + (to - from) * eased);
      el.innerHTML = val + (isPercent ? '<span class="unit">%</span>' : '');
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderList() {
    const list = $('#app-list');
    if (!state.apps.length) {
      list.innerHTML = '<div class="empty">No applications logged yet. Add your first one →</div>';
      return;
    }
    const sorted = state.apps.slice().sort((a, b) => (b.dateApplied || '').localeCompare(a.dateApplied || ''));
    list.innerHTML = sorted.map((a, i) => `
      <article class="app-card" data-id="${a.id}" style="animation-delay:${Math.min(i, 8) * 40}ms">
        <div class="app-card-main">
          <div class="app-card-top">
            <span class="app-company">${escape(a.company)}</span>
            <span class="app-role">· ${escape(a.role)}</span>
          </div>
          <div class="app-meta">
            <span class="field-tag">${escape(a.field)}</span>
            <span>${escape(a.dateApplied || '—')}</span>
            <span>· ${a.daysAfter ?? 0}d after posting</span>
          </div>
        </div>
        <span class="badge ${a.status.toLowerCase()}">${a.status}</span>
        <button class="btn-delete" data-del="${a.id}" aria-label="Delete">×</button>
      </article>
    `).join('');

    $$('[data-del]', list).forEach(btn => {
      btn.addEventListener('click', () => deleteApp(btn.dataset.del));
    });
  }

  function escape(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])
    );
  }

  // ---------- ADD / DELETE ----------
  function addApp(data) {
    const app = {
      id: id(),
      company: data.company.trim(),
      role: data.role.trim(),
      field: data.field,
      dateApplied: data.dateApplied || dateOffset(0),
      daysAfter: Number(data.daysAfter) || 0,
      status: data.status,
    };
    state.apps.push(app);
    save();
    render({ pulse: true });
  }

  function deleteApp(idVal) {
    const card = document.querySelector(`.app-card[data-id="${idVal}"]`);
    if (card) {
      card.classList.add('removing');
      setTimeout(() => {
        state.apps = state.apps.filter(a => a.id !== idVal);
        save();
        render({ pulse: true });
      }, 200);
    } else {
      state.apps = state.apps.filter(a => a.id !== idVal);
      save();
      render({ pulse: true });
    }
  }

  // ---------- FORM ----------
  const form = $('#add-form');
  $('#dateApplied').value = dateOffset(0);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const company = $('#company');
    const role = $('#role');
    let valid = true;
    [company, role].forEach(input => {
      input.classList.remove('invalid');
      if (!input.value.trim()) {
        input.classList.add('invalid');
        valid = false;
        setTimeout(() => input.classList.remove('invalid'), 420);
      }
    });
    if (!valid) return;

    addApp({
      company: company.value,
      role: role.value,
      field: $('#field').value,
      dateApplied: $('#dateApplied').value,
      daysAfter: $('#daysAfter').value,
      status: $('#status').value,
    });
    company.value = '';
    role.value = '';
    $('#daysAfter').value = '0';
    $('#status').value = 'Applied';
    company.focus();
  });

  // ---------- FUNNEL ----------
  function renderFunnel(animate) {
    const funnel = $('#funnel');
    const total = state.apps.length;
    const stages = [
      { key: 'applied',    label: 'Applied',    matcher: () => true },
      { key: 'screening',  label: 'Screening',  matcher: a => ['Screening','Interview','Offer'].includes(a.status) },
      { key: 'interview',  label: 'Interview',  matcher: a => ['Interview','Offer'].includes(a.status) },
      { key: 'offer',      label: 'Offer',      matcher: a => a.status === 'Offer' },
      { key: 'rejected',   label: 'Rejected',   matcher: a => a.status === 'Rejected' },
    ];
    const counts = stages.map(s => state.apps.filter(s.matcher).length);
    const max = Math.max(1, ...counts);

    funnel.innerHTML = stages.map((s, i) => {
      const count = counts[i];
      const widthPct = (count / max) * 100;
      const conv = total ? Math.round((count / total) * 100) : 0;
      return `
        <div class="funnel-row">
          <div class="funnel-label">${s.label}</div>
          <div class="funnel-bar-track">
            <div class="funnel-bar-fill" data-stage="${s.key}" data-w="${widthPct}" style="width:${animate ? 0 : widthPct}%">
              <span class="funnel-conv">${count > 0 ? conv + '%' : ''}</span>
            </div>
          </div>
          <div class="funnel-count">${count}</div>
        </div>
      `;
    }).join('');

    if (animate) {
      requestAnimationFrame(() => {
        $$('.funnel-bar-fill', funnel).forEach(el => {
          el.style.width = el.dataset.w + '%';
        });
      });
    }
  }

  // ---------- INSIGHT ENGINE ----------
  function generateInsights() {
    const apps = state.apps;
    const lines = [];
    if (apps.length === 0) {
      return ['$ no data to analyze. log a few applications first.'];
    }

    lines.push('$ analyzing ' + apps.length + ' applications...');
    lines.push('');

    // 1. Response by field
    const byField = {};
    apps.forEach(a => {
      byField[a.field] = byField[a.field] || [];
      byField[a.field].push(a);
    });
    const fieldStats = Object.entries(byField)
      .filter(([_, arr]) => arr.length >= 2)
      .map(([f, arr]) => {
        const r = arr.filter(a => ['Screening','Interview','Offer'].includes(a.status)).length;
        return { field: f, total: arr.length, responded: r, rate: r / arr.length };
      })
      .sort((a, b) => b.rate - a.rate);

    if (fieldStats.length >= 2) {
      const top = fieldStats[0];
      const bot = fieldStats[fieldStats.length - 1];
      lines.push('[response by field]');
      lines.push('Your ' + top.field + ' response rate is ' + Math.round(top.rate * 100) + '% (' + top.responded + '/' + top.total + ') — your strongest field.');
      lines.push(bot.field + ' lags at ' + Math.round(bot.rate * 100) + '% (' + bot.responded + '/' + bot.total + ').');
      lines.push('');
    } else if (fieldStats.length === 1) {
      const only = fieldStats[0];
      lines.push('[response by field]');
      lines.push(only.field + ': ' + Math.round(only.rate * 100) + '% response (' + only.responded + '/' + only.total + ').');
      lines.push('Diversify your fields to find your strongest signal.');
      lines.push('');
    }

    // 2. Early vs late
    const early = apps.filter(a => Number(a.daysAfter) <= 3);
    const late  = apps.filter(a => Number(a.daysAfter) >  3);
    if (early.length >= 3 && late.length >= 3) {
      const er = early.filter(a => ['Screening','Interview','Offer'].includes(a.status)).length / early.length;
      const lr = late.filter(a => ['Screening','Interview','Offer'].includes(a.status)).length / late.length;
      lines.push('[timing]');
      lines.push('Applying within 3 days: ' + Math.round(er * 100) + '% response.');
      lines.push('Applying after 3 days:  ' + Math.round(lr * 100) + '% response.');
      if (er > lr + 0.05) lines.push('Apply faster — early submissions outperform by ' + Math.round((er - lr) * 100) + ' points.');
      else if (lr > er + 0.05) lines.push('Curiously, later submissions are doing better. Sample is small; keep collecting.');
      else lines.push('Timing is roughly neutral for you. Focus on quality over speed.');
      lines.push('');
    }

    // 3. Funnel drop-off
    const c_app = apps.length;
    const c_scr = apps.filter(a => ['Screening','Interview','Offer'].includes(a.status)).length;
    const c_int = apps.filter(a => ['Interview','Offer'].includes(a.status)).length;
    const c_off = apps.filter(a => a.status === 'Offer').length;
    const drops = [
      { from: 'Applied',   to: 'Screening', a: c_app, b: c_scr },
      { from: 'Screening', to: 'Interview', a: c_scr, b: c_int },
      { from: 'Interview', to: 'Offer',     a: c_int, b: c_off },
    ].filter(d => d.a > 0);
    if (drops.length) {
      const worst = drops.slice().sort((x, y) => (x.b / x.a) - (y.b / y.a))[0];
      const conv = worst.a > 0 ? Math.round((worst.b / worst.a) * 100) : 0;
      lines.push('[funnel drop-off]');
      lines.push('Biggest drop: ' + worst.from + ' → ' + worst.to + ' (' + worst.a + ' → ' + worst.b + ', ' + conv + '%).');
      if (worst.from === 'Applied')        lines.push('Most apps stall at the resume screen — refine your resume keywords and target tighter.');
      else if (worst.from === 'Screening') lines.push('Practice behavioral and "tell me about yourself" — most are lost at first call.');
      else                                 lines.push('Invest in interview prep: mock interviews, STAR stories, role-specific cases.');
      lines.push('');
    }

    // 4. Action items
    lines.push('[action items]');
    const actions = [];
    if (fieldStats.length) {
      const top = fieldStats[0];
      actions.push('1. Apply to 3 more ' + top.field + ' roles this week — your strongest field at ' + Math.round(top.rate * 100) + '%.');
    } else {
      actions.push('1. Log at least 5 more apps to unlock field-level insights.');
    }
    if (early.length < 3 && apps.length >= 3) {
      actions.push('2. Set a job-board alert — most of your apps are 4+ days late.');
    } else {
      actions.push('2. Aim for daysAfter ≤ 3 on at least 80% of new applications.');
    }
    if (c_int > 0 && c_off === 0) {
      actions.push('3. You are getting interviews but no offers — schedule 2 mock interviews this week.');
    } else if (c_scr === 0 && apps.length >= 3) {
      actions.push('3. Zero screens yet — get a peer to review your resume and rewrite the top 3 bullets.');
    } else if (c_off > 0) {
      actions.push('3. You have an offer. Use it as leverage — every other live process should know.');
    } else {
      actions.push('3. Apply to 5 more roles before next Monday to keep the pipeline moving.');
    }
    actions.forEach(a => lines.push(a));

    return lines;
  }

  // ---------- TYPEWRITER ----------
  let typing = false;
  function typewriter(text, onDone) {
    const body = $('#terminal-body');
    body.innerHTML = '';
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    body.appendChild(cursor);

    let i = 0;
    typing = true;
    const interval = setInterval(() => {
      if (i >= text.length) {
        clearInterval(interval);
        typing = false;
        cursor.remove();
        if (onDone) onDone();
        return;
      }
      const ch = text[i++];
      const node = document.createTextNode(ch);
      body.insertBefore(node, cursor);
      // auto-scroll
      body.scrollTop = body.scrollHeight;
    }, 16);
  }

  $('#analyze-btn').addEventListener('click', () => {
    if (typing) return;
    const btn = $('#analyze-btn');
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Analyzing...';
    const lines = generateInsights();
    const text = lines.join('\n');
    typewriter(text, () => {
      btn.disabled = false;
      btn.textContent = original;
    });
  });

  // ---------- INIT ----------
  render();
})();
