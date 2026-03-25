let DEFAULT_DATA;
let DATA;
const EMPTY_DATA = {
  config: {
    projectCode: 'J1U',
    projectName: 'CMF Microplanning',
    sopDate: '',
    sopLabel: '',
    timelineStart: '',
    timelineEnd: '',
    nextGate: '',
    nextGateDetail: ''
  },
  milestones: [],
  phases: { fabrics: [], paints: [], textures: [] },
  activities: { fabrics: [], paints: [], textures: [] },
  decisions: [],
  notes: ''
};

function cloneDefaultData() {
  return JSON.parse(JSON.stringify(DEFAULT_DATA || EMPTY_DATA));
}

function normalizeDecisionItem(item, index) {
  if (!item || typeof item !== 'object') return null;
  const rawPriority = (item.priority || item.severity || item.level || 'info').toString().toLowerCase();
  const priority = ['urgent', 'medium', 'info'].includes(rawPriority) ? rawPriority : 'info';
  const rawStream = (item.stream || item.category || item.area || 'all').toString().toLowerCase();
  const stream = ['fabrics', 'paints', 'textures', 'all'].includes(rawStream) ? rawStream : 'all';
  const title = item.title || item.name || item.label || item.summary || item.decision || 'Untitled decision';
  const detail = item.detail || item.description || item.notes || item.reason || '';
  return {
    id: item.id || `decision-${index + 1}`,
    title,
    stream,
    priority,
    detail
  };
}

function normalizeData(data) {
  const normalized = { ...cloneDefaultData(), ...(data && typeof data === 'object' ? data : {}) };
  const decisionsSource =
    Array.isArray(normalized.decisions) ? normalized.decisions :
    Array.isArray(normalized.criticalDecisions) ? normalized.criticalDecisions :
    Array.isArray(normalized.critical_decisions) ? normalized.critical_decisions :
    Array.isArray(normalized.decisionsNeeded) ? normalized.decisionsNeeded :
    [];
  normalized.decisions = decisionsSource.map(normalizeDecisionItem).filter(Boolean);
  return normalized;
}

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function deriveCriticalDecisions() {
  const derived = [];
  const streams = ['fabrics', 'paints', 'textures'];

  streams.forEach(stream => {
    const activities = (DATA.activities && DATA.activities[stream]) || [];
    activities
      .filter(activity => activity && (activity.status === 'Risk' || activity.status === 'TBC'))
      .slice(0, 3)
      .forEach((activity, index) => {
        derived.push({
          id: `derived-${stream}-${activity.id || index}`,
          title: `${SL[stream]} · ${activity.name || 'Critical activity'}`,
          stream,
          priority: activity.status === 'Risk' ? 'urgent' : 'medium',
          detail: `Activity ${activity.num || '—'} is ${activity.status}${activity.obs ? ` — ${activity.obs}` : ''}`
        });
      });
  });

  return derived.slice(0, 6);
}

function getRenderableDecisions() {
  const explicitDecisions = Array.isArray(DATA.decisions) ? DATA.decisions.filter(Boolean) : [];
  return explicitDecisions.length ? explicitDecisions : deriveCriticalDecisions();
}

async function loadInitialData() {
  const candidates = ['data/DEFAULT_DATA.json', 'src/data/DEFAULT_DATA.json'];
  for (const path of candidates) {
    try {
      const response = await fetch(path);
      if (!response.ok) continue;
      DEFAULT_DATA = await response.json();
      return;
    } catch (e) {
      // Try the next known location.
    }
  }
  DEFAULT_DATA = cloneDefaultData();
  console.error('Failed to load default data from known paths');
}

function loadData() {
  try {
    const s = localStorage.getItem('j1u_cmf_data');
    DATA = normalizeData(s ? JSON.parse(s) : cloneDefaultData());
  } catch (e) {
    DATA = normalizeData(cloneDefaultData());
  }
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function cv(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function SC() {
  return { fabrics: cv('--fabric'), paints: cv('--paint'), textures: cv('--texture') };
}

const SI = { fabrics: '🧵', paints: '🎨', textures: '🔲' };
const SL = { fabrics: 'Fabrics', paints: 'Paints', textures: 'Textures' };

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── RENDER HEADER ─────────────────────────────────────────────────────────────
function renderHeader() {
  const cfg = DATA.config;
  document.getElementById('h-code').textContent = cfg.projectCode;
  document.getElementById('h-name').textContent = cfg.projectName + ' Dashboard';
  document.getElementById('h-sop-label').textContent = cfg.sopLabel;
  document.getElementById('h-date').textContent = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const days = Math.round((new Date(cfg.sopDate) - new Date()) / 86400000);
  document.getElementById('h-sop-days').textContent = days.toLocaleString() + 'd';
}

// ── RENDER KPIs ───────────────────────────────────────────────────────────────
function renderKPIs() {
  const ss = ['fabrics', 'paints', 'textures'];
  let ta = 0, tok = 0, ttbc = 0;
  ss.forEach(s => {
    const a = DATA.activities[s] || [];
    ta += a.length;
    tok += a.filter(x => x.status === 'OK').length;
    ttbc += a.filter(x => x.status === 'TBC').length;
  });
  const pct = ta ? Math.round(tok / ta * 100) : 0;
  const cfg = DATA.config;
  document.getElementById('kpi-grid').innerHTML = `
    <div class="bg-surface border border-border rounded-[11px] p-[17px] relative overflow-hidden hover:border-accent kpi-card"><div class="absolute top-0 left-0 right-0 h-[3px] rounded-t-[11px]" style="background:var(--accent)"></div>
      <div class="text-[10px] text-muted uppercase tracking-[0.09em] mb-1.5">Total Activities</div><div class="text-[28px] font-normal leading-none">${ta}</div><div class="text-[11px] text-muted mt-1.5">Across 3 CMF streams</div></div>
    <div class="bg-surface border border-border rounded-[11px] p-[17px] relative overflow-hidden hover:border-accent kpi-card"><div class="absolute top-0 left-0 right-0 h-[3px] rounded-t-[11px]" style="background:var(--ok)"></div>
      <div class="text-[10px] text-muted uppercase tracking-[0.09em] mb-1.5">Completed (OK)</div><div class="text-[28px] font-normal leading-none" style="color:var(--ok)">${tok}</div>
      <div class="inline-block text-[10px] py-[3px] px-[9px] rounded-full mt-1.5 tracking-[0.04em]" style="background:rgba(52,211,153,.12);color:var(--ok);border:1px solid rgba(52,211,153,.28)">${pct}% Done</div></div>
    <div class="bg-surface border border-border rounded-[11px] p-[17px] relative overflow-hidden hover:border-accent kpi-card"><div class="absolute top-0 left-0 right-0 h-[3px] rounded-t-[11px]" style="background:var(--warn)"></div>
      <div class="text-[10px] text-muted uppercase tracking-[0.09em] mb-1.5">To Confirm (TBC)</div><div class="text-[28px] font-normal leading-none" style="color:var(--warn)">${ttbc}</div>
      <div class="inline-block text-[10px] py-[3px] px-[9px] rounded-full mt-1.5 tracking-[0.04em]" style="background:rgba(251,191,36,.12);color:var(--warn);border:1px solid rgba(251,191,36,.28)">Needs Decision</div></div>
    <div class="bg-surface border border-border rounded-[11px] p-[17px] relative overflow-hidden hover:border-accent kpi-card"><div class="absolute top-0 left-0 right-0 h-[3px] rounded-t-[11px]" style="background:var(--pending)"></div>
      <div class="text-[10px] text-muted uppercase tracking-[0.09em] mb-1.5">Pending / Upcoming</div><div class="text-[28px] font-normal leading-none" style="color:var(--pending)">${ta - tok - ttbc}</div><div class="text-[11px] text-muted mt-1.5">Not yet started</div></div>
    <div class="bg-surface border border-border rounded-[11px] p-[17px] relative overflow-hidden hover:border-accent kpi-card"><div class="absolute top-0 left-0 right-0 h-[3px] rounded-t-[11px]" style="background:var(--accent)"></div>
      <div class="text-[10px] text-muted uppercase tracking-[0.09em] mb-1.5">Next Gate</div>
      <div class="text-[17px] font-normal leading-none mt-1.5" style="color:var(--accent)">${cfg.nextGate || '—'}</div>
      <div class="text-[11px] text-muted mt-1.5">${cfg.nextGateDetail || ''}</div></div>`;
}

// ── RENDER STREAMS ────────────────────────────────────────────────────────────
function renderStreams() {
  const streams = ['fabrics', 'paints', 'textures'];
  const hl = { fabrics: '⚠ In Progress', paints: '⚠ On Track', textures: '✓ Advanced' };
  const hc = { fabrics: 'h-warn', paints: 'h-warn', textures: 'h-ok' };
  const colors = SC();
  let html = '';
  streams.forEach(s => {
    const acts = DATA.activities[s] || [];
    const ok = acts.filter(a => a.status === 'OK').length;
    const tbc = acts.filter(a => a.status === 'TBC').length;
    const pend = acts.length - ok - tbc;
    const pp = acts.length ? Math.round(ok / acts.length * 100) : 0;
    const color = colors[s];
    html += `<div class="bg-surface border border-border rounded-[13px] overflow-hidden stream-card hover:border-accent hover:-translate-y-[2px]">
      <div class="py-[15px] px-[19px] border-b border-border flex items-start justify-between">
        <div><div class="text-[19px] mb-1">${SI[s]}</div>
          <div class="text-[14px] font-normal tracking-wide" style="color:${color}">${SL[s]}</div>
          <div class="text-[11px] text-muted mt-0.5">CMF Micro · ${acts.length} Activities</div></div>
        <div class="text-[10px] py-[4px] px-[10px] rounded-full uppercase tracking-wider ${hc[s]}">${hl[s]}</div>
      </div>
      <div class="py-[15px] px-[19px]">
        <div class="mb-[15px]">
          <div class="flex justify-between mb-1"><span class="text-[11px] text-muted">Overall Progress</span><span class="text-[11px] font-normal" style="color:${color}">${pp}%</span></div>
          <div class="bg-surface2 rounded h-1.5 overflow-hidden"><div class="h-full rounded transition-all duration-700 ease-in-out" style="width:${pp}%;background:${color}"></div></div>
        </div>
        <div class="grid grid-cols-3 gap-[7px] mb-3.5">
          <div class="bg-surface2 rounded-md py-2 px-2.5 text-center"><div class="text-[17px] font-normal" style="color:var(--ok)">${ok}</div><div class="text-[10px] text-muted uppercase mt-[1px] tracking-wider">Done</div></div>
          <div class="bg-surface2 rounded-md py-2 px-2.5 text-center"><div class="text-[17px] font-normal" style="color:var(--warn)">${tbc}</div><div class="text-[10px] text-muted uppercase mt-[1px] tracking-wider">TBC</div></div>
          <div class="bg-surface2 rounded-md py-2 px-2.5 text-center"><div class="text-[17px] font-normal" style="color:var(--muted)">${pend}</div><div class="text-[10px] text-muted uppercase mt-[1px] tracking-wider">Pending</div></div>
        </div>
      </div>
    </div>`;
  });
  document.getElementById('streams-grid').innerHTML = html;
}

// ── RENDER TIMELINE ───────────────────────────────────────────────────────────
function renderTimeline() {
  const cfg = DATA.config;
  const tStart = new Date(cfg.timelineStart), tEnd = new Date(cfg.timelineEnd), today = new Date();
  document.getElementById('tl-range').textContent =
    tStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) + ' → ' +
    tEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const el = document.getElementById('timeline-container');
  el.innerHTML = '';
  function pct(d) { return Math.max(0, Math.min(100, (new Date(d) - tStart) / (tEnd - tStart) * 100)); }

  // theme colors
  const nowLine = cv('--now-line');
  const tlTrack = cv('--tl-track');
  const tlBorder = cv('--tl-border');
  const milClr = cv('--milestone');
  const okClr = cv('--ok');
  const tipBg = cv('--tip-bg');
  const tipBrd = cv('--tip-brd');
  const tipText = cv('--tip-text');
  const mutedClr = cv('--muted');
  const colors = SC();

  const STREAMS = ['fabrics', 'paints', 'textures'];
  const ROW_H = 28, ROW_GAP = 12, LBL_W = 88;
  const milestones = DATA.milestones || [];
  const nowPct = pct(today);

  const outer = document.createElement('div');
  outer.style.cssText = 'position:relative;';

  const axis = document.createElement('div');
  axis.style.cssText = `display:flex;margin-left:${LBL_W}px;margin-bottom:10px;border-bottom:1px solid ${tlBorder};padding-bottom:7px;`;
  const months = []; let d = new Date(tStart);
  while (d <= tEnd) { months.push(new Date(d)); d.setMonth(d.getMonth() + 3); }
  months.forEach(m => {
    const isNow = today >= m && today < new Date(m.getFullYear(), m.getMonth() + 3, 1);
    const span = document.createElement('div');
    span.style.cssText = `flex:1;font-size:9px;color:${isNow ? nowLine : mutedClr};text-align:center;font-family:'Encode Sans',sans-serif;font-weight:${isNow ? '600' : '400'};letter-spacing:0.04em;`;
    span.textContent = m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    axis.appendChild(span);
  });
  outer.appendChild(axis);

  const rowsWrap = document.createElement('div');
  rowsWrap.style.cssText = 'position:relative;';

  const totalRowsH = STREAMS.length * (ROW_H + ROW_GAP) - ROW_GAP;

  milestones.forEach(m => {
    const x = pct(m.date);
    const isDone = m.status === 'done', isActive = m.status === 'active';
    const clr = isDone ? okClr : isActive ? milClr : mutedClr + '88';
    const gline = document.createElement('div');
    gline.style.cssText = `
      position:absolute;
      left:calc(${LBL_W}px + (100% - ${LBL_W}px) * ${x / 100});
      top:0; height:${totalRowsH}px;
      width:1px; background:${clr};
      opacity:${isDone ? .5 : isActive ? .85 : .35};
      z-index:2; pointer-events:none;`;
    rowsWrap.appendChild(gline);
  });

  const todayLine = document.createElement('div');
  todayLine.style.cssText = `
    position:absolute;
    left:calc(${LBL_W}px + (100% - ${LBL_W}px) * ${nowPct / 100});
    top:0; height:${totalRowsH}px;
    width:2px; background:${nowLine};
    opacity:.9; z-index:5; pointer-events:none;`;
  const todayDot = document.createElement('div');
  todayDot.style.cssText = `position:absolute;top:-4px;left:50%;transform:translateX(-50%);width:8px;height:8px;background:${nowLine};border-radius:50%;`;
  todayLine.appendChild(todayDot);
  rowsWrap.appendChild(todayLine);

  STREAMS.forEach((s, i) => {
    const color = colors[s];
    const phases = (DATA.phases && DATA.phases[s]) || [];
    const row = document.createElement('div');
    row.style.cssText = `display:flex;align-items:center;gap:0;margin-bottom:${i < STREAMS.length - 1 ? ROW_GAP : 0}px;`;

    const lbl = document.createElement('div');
    lbl.style.cssText = `width:${LBL_W}px;flex-shrink:0;font-size:10px;font-weight:400;color:${color};text-transform:uppercase;letter-spacing:.09em;font-family:'Encode Sans',sans-serif;padding-right:10px;`;
    lbl.textContent = SL[s].toUpperCase();
    row.appendChild(lbl);

    const wrap = document.createElement('div');
    wrap.style.cssText = `flex:1;height:${ROW_H}px;position:relative;`;

    const track = document.createElement('div');
    track.style.cssText = `position:absolute;inset:4px 0;background:${tlTrack};border-radius:5px;`;
    wrap.appendChild(track);

    phases.forEach(ph => {
      const l = pct(ph.start), r = pct(ph.end), w = r - l; if (w <= 0) return;
      const seg = document.createElement('div');
      const alpha = ph.done ? 'cc' : ph.active ? '99' : '40';
      seg.style.cssText = `position:absolute;left:${l}%;width:${w}%;top:4px;height:${ROW_H - 8}px;border-radius:4px;background:${color}${alpha};display:flex;align-items:center;padding:0 6px;border:1px solid ${color}${ph.done ? '80' : ph.active ? '55' : '28'};z-index:3;`;
      if (w > 6) {
        const t = document.createElement('span');
        t.style.cssText = `font-size:8px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.9;`;
        t.textContent = ph.name; seg.appendChild(t);
      }
      wrap.appendChild(seg);
    });

    row.appendChild(wrap);
    rowsWrap.appendChild(row);
  });

  outer.appendChild(rowsWrap);

  const TIER_A_DIA = 2, TIER_A_LBL = 14;
  const TIER_B_DIA = 36, TIER_B_LBL = 48;
  const labelRowH = TIER_B_LBL + 11;

  const labelRow = document.createElement('div');
  labelRow.style.cssText = `position:relative;height:${labelRowH}px;margin-top:6px;`;

  const lspacer = document.createElement('div');
  lspacer.style.cssText = `position:absolute;left:0;width:${LBL_W}px;top:0;bottom:0;`;
  const lspTxt = document.createElement('div');
  lspTxt.style.cssText = `font-size:10px;font-weight:400;color:${milClr};text-transform:uppercase;letter-spacing:.09em;font-family:'Encode Sans',sans-serif;padding-right:10px;padding-top:10px;`;
  lspTxt.textContent = 'GATES';
  lspacer.appendChild(lspTxt);
  labelRow.appendChild(lspacer);

  const labelArea = document.createElement('div');
  labelArea.style.cssText = `position:absolute;left:${LBL_W}px;right:0;top:0;height:${labelRowH}px;`;

  const connLine = document.createElement('div');
  connLine.style.cssText = `position:absolute;left:0;right:0;top:${TIER_A_DIA + 5}px;height:1px;background:${milClr}22;pointer-events:none;`;
  labelArea.appendChild(connLine);

  const addTip = (el, m) => {
    el.onmouseenter = e => {
      const tip = document.createElement('div'); tip.id = 'tl-tip';
      tip.style.cssText = `position:fixed;background:${tipBg};border:1px solid ${tipBrd};padding:5px 10px;border-radius:6px;font-size:11px;font-family:'Encode Sans',sans-serif;color:${tipText};z-index:1000;pointer-events:none;white-space:nowrap;`;
      tip.textContent = m.name + ' · ' + fmtDate(m.date);
      document.body.appendChild(tip);
      tip.style.left = (e.clientX + 12) + 'px'; tip.style.top = (e.clientY - 8) + 'px';
    };
    el.onmouseleave = () => { const t = document.getElementById('tl-tip'); if (t) t.remove(); };
  };

  milestones.forEach((m, i) => {
    const x = pct(m.date);
    const isDone = m.status === 'done', isActive = m.status === 'active';
    const clr = isDone ? okClr : isActive ? milClr : mutedClr;
    const isRowA = (i % 2 === 0);
    const diaTop = isRowA ? TIER_A_DIA : TIER_B_DIA;
    const lblTop = isRowA ? TIER_A_LBL : TIER_B_LBL;

    const tick = document.createElement('div');
    tick.style.cssText = `position:absolute;left:${x}%;top:${TIER_A_DIA + 5}px;width:1px;height:${diaTop - (TIER_A_DIA + 5) + 5}px;background:${clr};opacity:.4;pointer-events:none;`;
    labelArea.appendChild(tick);

    const dia = document.createElement('div');
    dia.style.cssText = `position:absolute;left:calc(${x}% - 5px);top:${diaTop}px;width:10px;height:10px;background:${clr};transform:rotate(45deg);border:1px solid rgba(0,0,0,0.15);z-index:4;cursor:default;`;
    addTip(dia, m);
    labelArea.appendChild(dia);

    const tag = document.createElement('div');
    tag.style.cssText = `position:absolute;left:${x}%;transform:translateX(-50%);top:${lblTop}px;font-size:8px;color:${clr};font-family:'Encode Sans',sans-serif;white-space:normal;word-break:keep-all;text-align:center;cursor:default;line-height:1.3;width:56px;margin-left:-28px;letter-spacing:0.02em;`;
    tag.textContent = m.name;
    addTip(tag, m);
    labelArea.appendChild(tag);
  });

  labelRow.appendChild(labelArea);
  outer.appendChild(labelRow);
  el.appendChild(outer);
}

// ── RENDER DECISIONS ──────────────────────────────────────────────────────────
function renderDecisions() {
  const decisions = getRenderableDecisions();
  const html = decisions.map(d => {
    const borderLeft = d.priority === 'urgent' ? 'border-l-risk' : (d.priority === 'medium' ? 'border-l-warn' : 'border-l-accent');
    const streamLabel = d.stream === 'all' ? 'ALL' : (d.stream || 'all').toUpperCase();
    return `<div class="py-2.5 px-3 bg-surface2 rounded-md border-l-[3px] border-l-transparent mb-2 decision-item ${borderLeft}">
      <div class="text-xs mb-1">${escapeHTML(d.title)}<span class="text-[9px] py-0.5 px-1.5 rounded ml-1.5 tracking-wider uppercase stream-tag tag-${d.stream || 'all'}">${escapeHTML(streamLabel)}</span></div>
      <div class="text-[11px] text-muted leading-relaxed">${escapeHTML(d.detail || 'No detail provided.')}</div>
    </div>`
  }).join('');
  document.getElementById('decisions-panel').innerHTML = html || `<div style="color:var(--muted);font-size:13px">No decisions flagged.</div>`;
}

// ── RENDER NOTES ──────────────────────────────────────────────────────────────
function renderNotes() { document.getElementById('notes-display').textContent = DATA.notes || 'No notes yet. Add them in the Data Editor.'; }

// ── FULL RENDER ───────────────────────────────────────────────────────────────
function render() { loadData(); renderHeader(); renderKPIs(); renderStreams(); renderTimeline(); renderDecisions(); renderNotes(); }

// ── THEME TOGGLE ──────────────────────────────────────────────────────────────
function applyTheme(light) {
  document.documentElement.classList.toggle('light', light);
  document.getElementById('t-icon').textContent = light ? '🌙' : '☀️';
  document.getElementById('t-label').textContent = light ? 'Dark Mode' : 'Light Mode';
}
function toggleTheme() {
  const goLight = !document.documentElement.classList.contains('light');
  applyTheme(goLight);
  try { localStorage.setItem('j1u_theme', goLight ? 'light' : 'dark'); } catch (e) { }
  renderTimeline();
}

// ── INITIALIZE ────────────────────────────────────────────────────────────────
(async function() {
  await loadInitialData();
  try { const saved = localStorage.getItem('j1u_theme'); if (saved === 'light') applyTheme(true); } catch (e) { }
  render();
  window.addEventListener('storage', e => { if (e.key === 'j1u_cmf_data') render(); });
})();
