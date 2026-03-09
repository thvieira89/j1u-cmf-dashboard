let DEFAULT_DATA;
let DATA;

async function loadInitialData() {
  try {
    const response = await fetch('data/DEFAULT_DATA.json');
    DEFAULT_DATA = await response.json();
  } catch (e) {
    console.error('Failed to load default data', e);
  }
}

function loadData() {
  try {
    const saved = localStorage.getItem('j1u_cmf_data');
    if (saved) {
      DATA = JSON.parse(saved);
    } else {
      DATA = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
  } catch (e) {
    DATA = JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

function saveData() {
  try {
    localStorage.setItem('j1u_cmf_data', JSON.stringify(DATA));
  } catch (e) { }
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.getElementById('nav-' + id).classList.add('active');
  renderPage(id);
}

function renderPage(id) {
  if (id === 'overview') renderOverview();
  if (id === 'milestones') renderMilestones();
  if (id === 'decisions') renderDecisions();
  if (id === 'fabrics') renderStreamTable('fabrics');
  if (id === 'paints') renderStreamTable('paints');
  if (id === 'textures') renderStreamTable('textures');
  if (id === 'notes') renderNotes();
  if (id === 'rawjson') refreshRawJSON();
}

// ─── OVERVIEW ────────────────────────────────────────────────────────────────
function renderOverview() {
  const cfg = DATA.config;
  document.getElementById('cfg-projectCode').value = cfg.projectCode || '';
  document.getElementById('cfg-projectName').value = cfg.projectName || '';
  document.getElementById('cfg-sopDate').value = cfg.sopDate || '';
  document.getElementById('cfg-sopLabel').value = cfg.sopLabel || '';
  document.getElementById('cfg-timelineStart').value = cfg.timelineStart || '';
  document.getElementById('cfg-timelineEnd').value = cfg.timelineEnd || '';
  document.getElementById('cfg-nextGate').value = cfg.nextGate || '';
  document.getElementById('cfg-nextGateDetail').value = cfg.nextGateDetail || '';

  const streams = ['fabrics', 'paints', 'textures'];
  const colors = { fabrics: '#06b6d4', paints: '#f97316', textures: '#a78bfa' };
  const icons = { fabrics: '🧵', paints: '🎨', textures: '🔲' };
  let html = '<div class="grid grid-cols-3 gap-4">';
  streams.forEach(s => {
    const acts = DATA.activities[s] || [];
    const ok = acts.filter(a => a.status === 'OK').length;
    const tbc = acts.filter(a => a.status === 'TBC').length;
    const pct = acts.length ? Math.round(ok / acts.length * 100) : 0;
    html += `<div class="bg-surface border border-border rounded-[10px] p-4" style="border-top:3px solid ${colors[s]}">
      <div class="text-[13px] font-semibold mb-3" style="color:${colors[s]}">${icons[s]} ${s.charAt(0).toUpperCase() + s.slice(1)}</div>
      <div class="grid grid-cols-3 gap-2 mb-3">
        <div class="text-center"><div class="text-[22px] font-bold text-ok tabular-nums tracking-tight">${ok}</div><div class="text-[10px] text-muted">Done</div></div>
        <div class="text-center"><div class="text-[22px] font-bold text-warn tabular-nums tracking-tight">${tbc}</div><div class="text-[10px] text-muted">TBC</div></div>
        <div class="text-center"><div class="text-[22px] font-bold text-muted tabular-nums tracking-tight">${acts.length - ok - tbc}</div><div class="text-[10px] text-muted">Pending</div></div>
      </div>
      <div class="bg-surface2 rounded h-1.5 overflow-hidden">
        <div class="h-full rounded" style="width:${pct}%;background:${colors[s]}"></div>
      </div>
      <div class="text-[11px] text-muted mt-1.5">${pct}% complete · ${acts.length} total activities</div>
    </div>`;
  });
  html += '</div>';
  document.getElementById('overview-kpis').innerHTML = html;
}

function saveCfg() {
  DATA.config = {
    projectCode: document.getElementById('cfg-projectCode').value,
    projectName: document.getElementById('cfg-projectName').value,
    sopDate: document.getElementById('cfg-sopDate').value,
    sopLabel: document.getElementById('cfg-sopLabel').value,
    timelineStart: document.getElementById('cfg-timelineStart').value,
    timelineEnd: document.getElementById('cfg-timelineEnd').value,
    nextGate: document.getElementById('cfg-nextGate').value,
    nextGateDetail: document.getElementById('cfg-nextGateDetail').value,
  };
  saveData(); toast('Settings saved!');
}

// ─── MILESTONES ───────────────────────────────────────────────────────────────
const streamColors = { fabrics: '#06b6d4', paints: '#f97316', textures: '#a78bfa' };
const statusOpts = ['done', 'active', 'upcoming', 'delayed', 'tbc'];

function renderMilestones() {
  const streams = ['fabrics', 'paints', 'textures'];
  let html = '';
  streams.forEach(s => {
    const ms = DATA.milestones.filter(m => m.stream === s);
    html += `<div class="text-[11px] font-semibold uppercase tracking-widest py-2.5 px-0 border-b border-border mb-3.5 flex items-center justify-between" style="color:${streamColors[s]}">${s.toUpperCase()} MILESTONES <button class="py-[5px] px-[12px] text-[11px] rounded-lg font-semibold cursor-pointer font-sans transition-all duration-150 bg-surface2 text-text border border-border hover:bg-border" onclick="openAddMilestone('${s}')">+ Add</button></div>`;
    html += '<div class="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5 mb-5">';
    ms.forEach(m => {
      html += `<div class="bg-surface2 border border-border rounded-[10px] p-4">
        <div class="text-[10px] font-bold uppercase tracking-[0.07em] mb-1.5" style="color:${streamColors[s]}">${s}</div>
        <input class="form-input mb-2 font-semibold" value="${m.name}" onchange="updateMilestone('${m.id}','name',this.value)">
        <div class="grid grid-cols-2 gap-[14px]">
          <div class="flex flex-col gap-[5px]"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Date</div>
            <input class="form-input" type="date" value="${m.date}" onchange="updateMilestone('${m.id}','date',this.value)"></div>
          <div class="flex flex-col gap-[5px]"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Status</div>
            <select class="form-select" onchange="updateMilestone('${m.id}','status',this.value)">
              ${statusOpts.map(o => `<option value="${o}" ${m.status === o ? 'selected' : ''}>${o}</option>`).join('')}
            </select></div>
        </div>
        <div class="mt-2.5 flex justify-end">
          <button class="py-[5px] px-[12px] text-[11px] rounded-lg font-semibold cursor-pointer font-sans transition-all duration-150 bg-risk/10 text-risk border border-risk/25 hover:bg-risk/20" onclick="deleteMilestone('${m.id}')">✕ Remove</button>
        </div>
      </div>`;
    });
    html += '</div>';
  });
  document.getElementById('milestones-content').innerHTML = html;
}

function updateMilestone(id, field, val) {
  const m = DATA.milestones.find(x => x.id === id);
  if (m) { m[field] = val; saveData(); }
}
function deleteMilestone(id) {
  if (!confirm('Remove this milestone?')) return;
  DATA.milestones = DATA.milestones.filter(m => m.id !== id);
  saveData(); renderMilestones(); toast('Milestone removed');
}
function openAddMilestone(stream) {
  openModal('Add Milestone', 'Add a new milestone gate', `
    <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[14px] mb-[14px]">
      <div class="flex flex-col gap-[5px]"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Stream</div>
        <select class="form-select" id="nm-stream">
          <option value="fabrics" ${stream === 'fabrics' ? 'selected' : ''}>Fabrics</option>
          <option value="paints" ${stream === 'paints' ? 'selected' : ''}>Paints</option>
          <option value="textures" ${stream === 'textures' ? 'selected' : ''}>Textures</option>
        </select></div>
      <div class="flex flex-col gap-[5px]"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Name</div><input class="form-input" id="nm-name" placeholder="CMF Direction"></div>
      <div class="flex flex-col gap-[5px]"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Date</div><input class="form-input" type="date" id="nm-date"></div>
      <div class="flex flex-col gap-[5px]"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Status</div>
        <select class="form-select" id="nm-status">
          ${statusOpts.map(o => `<option value="${o}">${o}</option>`).join('')}
        </select></div>
    </div>`, () => {
    DATA.milestones.push({ id: 'm' + Date.now(), stream: document.getElementById('nm-stream').value, name: document.getElementById('nm-name').value, date: document.getElementById('nm-date').value, status: document.getElementById('nm-status').value });
    saveData(); renderMilestones(); closeModal(); toast('Milestone added!');
  });
}

// ─── DECISIONS ────────────────────────────────────────────────────────────────
function renderDecisions() {
  let html = '';
  DATA.decisions.forEach(d => {
    const borderColor = d.priority === 'urgent' ? 'var(--risk)' : d.priority === 'medium' ? 'var(--warn)' : 'var(--accent)';
    html += `<div class="bg-surface border border-border rounded-xl mb-4 overflow-hidden" style="border-left:3px solid ${borderColor}">
      <div class="p-4">
        <div class="grid grid-cols-[2fr_1fr_1fr] gap-3 mb-2">
          <div class="flex flex-col gap-1"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Title</div><input class="form-input" value="${d.title}" onchange="updateDecision('${d.id}','title',this.value)"></div>
          <div class="flex flex-col gap-1"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Stream</div>
            <select class="form-select" onchange="updateDecision('${d.id}','stream',this.value)">
              <option value="fabrics" ${d.stream === 'fabrics' ? 'selected' : ''}>Fabrics</option>
              <option value="paints" ${d.stream === 'paints' ? 'selected' : ''}>Paints</option>
              <option value="textures" ${d.stream === 'textures' ? 'selected' : ''}>Textures</option>
              <option value="all" ${d.stream === 'all' ? 'selected' : ''}>All Streams</option>
            </select></div>
          <div class="flex flex-col gap-1"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Priority</div>
            <select class="form-select" onchange="updateDecision('${d.id}','priority',this.value)">
              <option value="urgent" ${d.priority === 'urgent' ? 'selected' : ''}>🔴 Urgent</option>
              <option value="medium" ${d.priority === 'medium' ? 'selected' : ''}>🟡 Medium</option>
              <option value="info" ${d.priority === 'info' ? 'selected' : ''}>🔵 Info</option>
            </select></div>
        </div>
        <div class="flex flex-col gap-1 mb-2"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Detail</div>
          <textarea class="form-textarea" style="min-height:56px" onchange="updateDecision('${d.id}','detail',this.value)">${d.detail}</textarea></div>
        <div class="flex justify-end"><button class="py-[5px] px-[12px] text-[11px] rounded-lg font-semibold cursor-pointer font-sans transition-all duration-150 bg-risk/10 text-risk border border-risk/25 hover:bg-risk/20" onclick="deleteDecision('${d.id}')">✕ Remove</button></div>
      </div>
    </div>`;
  });
  document.getElementById('decisions-list').innerHTML = html;
}

function updateDecision(id, field, val) {
  const d = DATA.decisions.find(x => x.id === id);
  if (d) { d[field] = val; saveData(); }
}
function deleteDecision(id) {
  if (!confirm('Remove this decision item?')) return;
  DATA.decisions = DATA.decisions.filter(d => d.id !== id);
  saveData(); renderDecisions(); toast('Item removed');
}
function openAddDecision() {
  openModal('Add Decision Item', '', `
    <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[14px] mb-[14px]">
      <div class="flex flex-col gap-[5px] col-span-full"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Title</div><input class="form-input" id="nd-title" placeholder="Decision title..."></div>
      <div class="flex flex-col gap-[5px]"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Stream</div>
        <select class="form-select" id="nd-stream">
          <option value="fabrics">Fabrics</option><option value="paints">Paints</option><option value="textures">Textures</option><option value="all">All</option>
        </select></div>
      <div class="flex flex-col gap-[5px]"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Priority</div>
        <select class="form-select" id="nd-priority">
          <option value="urgent">🔴 Urgent</option><option value="medium">🟡 Medium</option><option value="info">🔵 Info</option>
        </select></div>
    </div>
    <div class="flex flex-col gap-[5px]"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Detail</div><textarea class="form-textarea" id="nd-detail" placeholder="Describe what decision is needed..."></textarea></div>
  `, () => {
    DATA.decisions.push({ id: 'd' + Date.now(), title: document.getElementById('nd-title').value, stream: document.getElementById('nd-stream').value, priority: document.getElementById('nd-priority').value, detail: document.getElementById('nd-detail').value });
    saveData(); renderDecisions(); closeModal(); toast('Decision item added!');
  });
}

// ─── STREAM TABLES ────────────────────────────────────────────────────────────
const statusOptions = ['OK', 'TBC', 'Pending', 'Risk'];
function renderStreamTable(stream) {
  const acts = DATA.activities[stream] || [];
  let html = `<div class="bg-surface border border-border rounded-xl mb-4 overflow-hidden"><div class="py-[14px] px-[20px] border-b border-border flex items-center justify-between"><div class="text-[14px] font-semibold">${acts.length} Activities</div>
    <div class="text-[11px] text-muted">Click any cell to edit inline · changes auto-save</div></div>
  <div class="overflow-x-auto"><table class="data-table"><thead><tr>
    <th class="w-12">#</th><th>Activity Name</th><th>Responsible</th><th class="w-[110px]">Date</th><th class="w-[90px]">Status</th><th>Observations</th><th class="w-[70px]">Actions</th>
  </tr></thead><tbody id="tbody-${stream}">`;

  acts.forEach(a => {
    html += `<tr id="row-${a.id}">
      <td><span class="inline-edit" contenteditable="true" onblur="updateActivity('${stream}','${a.id}','num',this.textContent.trim())">${a.num}</span></td>
      <td><span class="inline-edit min-w-[200px] block" contenteditable="true" onblur="updateActivity('${stream}','${a.id}','name',this.textContent.trim())">${a.name}</span></td>
      <td><span class="inline-edit" contenteditable="true" onblur="updateActivity('${stream}','${a.id}','responsible',this.textContent.trim())">${a.responsible}</span></td>
      <td><input class="inline-edit w-[108px]" type="date" value="${a.date || ''}" onchange="updateActivity('${stream}','${a.id}','date',this.value)"></td>
      <td>
        <select class="form-select py-1 px-2 text-[11px]" onchange="updateActivity('${stream}','${a.id}','status',this.value)">
          ${statusOptions.map(o => `<option value="${o}" ${a.status === o ? 'selected' : ''}>${o}</option>`).join('')}
        </select>
      </td>
      <td><span class="inline-edit min-w-[120px] block text-muted text-[11px]" contenteditable="true" onblur="updateActivity('${stream}','${a.id}','obs',this.textContent.trim())">${a.obs || ''}</span></td>
      <td><button class="py-[5px] px-[12px] text-[11px] rounded-lg font-semibold cursor-pointer font-sans transition-all duration-150 bg-risk/10 text-risk border border-risk/25 hover:bg-risk/20" onclick="deleteActivity('${stream}','${a.id}')">✕</button></td>
    </tr>`;
  });
  html += '</tbody></table></div></div>';
  document.getElementById('stream-table-' + stream).innerHTML = html;
}

function updateActivity(stream, id, field, val) {
  const a = (DATA.activities[stream] || []).find(x => x.id === id);
  if (a) { a[field] = val; saveData(); }
}
function deleteActivity(stream, id) {
  if (!confirm('Remove this activity?')) return;
  DATA.activities[stream] = DATA.activities[stream].filter(a => a.id !== id);
  saveData(); renderStreamTable(stream); toast('Activity removed');
}
function openAddActivity(stream) {
  openModal('Add Activity', `Add to ${stream}`, `
    <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[14px] mb-[14px]">
      <div class="flex flex-col gap-[5px]"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Number / ID</div><input class="form-input" id="na-num" placeholder="e.g. 5.2"></div>
      <div class="flex flex-col gap-[5px]"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Status</div>
        <select class="form-select" id="na-status">
          ${statusOptions.map(o => `<option value="${o}">${o}</option>`).join('')}
        </select></div>
    </div>
    <div class="flex flex-col gap-[5px] mb-3"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Activity Name</div><input class="form-input" id="na-name" placeholder="Activity description..."></div>
    <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[14px] mb-[14px]">
      <div class="flex flex-col gap-[5px]"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Responsible</div><input class="form-input" id="na-resp" placeholder="Design / Compras"></div>
      <div class="flex flex-col gap-[5px]"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Date</div><input class="form-input" type="date" id="na-date"></div>
    </div>
    <div class="flex flex-col gap-[5px]"><div class="text-[11px] font-medium text-muted uppercase tracking-[0.06em]">Observations</div><textarea class="form-textarea" id="na-obs" style="min-height:56px"></textarea></div>
  `, () => {
    if (!DATA.activities[stream]) DATA.activities[stream] = [];
    DATA.activities[stream].push({ id: 'a' + Date.now(), num: document.getElementById('na-num').value, name: document.getElementById('na-name').value, responsible: document.getElementById('na-resp').value, status: document.getElementById('na-status').value, date: document.getElementById('na-date').value, obs: document.getElementById('na-obs').value });
    saveData(); renderStreamTable(stream); closeModal(); toast('Activity added!');
  });
}

// ─── NOTES ────────────────────────────────────────────────────────────────────
let notesTimer;
function renderNotes() {
  document.getElementById('notes-editor').value = DATA.notes || '';
}
function autoSaveNotes() {
  clearTimeout(notesTimer);
  document.getElementById('notes-saved-indicator').textContent = 'Editing...';
  notesTimer = setTimeout(() => {
    DATA.notes = document.getElementById('notes-editor').value;
    saveData();
    document.getElementById('notes-saved-indicator').textContent = '✓ Auto-saved ' + new Date().toLocaleTimeString();
  }, 800);
}

// ─── RAW JSON ────────────────────────────────────────────────────────────────
function refreshRawJSON() {
  document.getElementById('raw-json-area').value = JSON.stringify(DATA, null, 2);
}
function applyRawJSON() {
  try {
    DATA = JSON.parse(document.getElementById('raw-json-area').value);
    saveData(); toast('JSON applied!');
  } catch (e) { toast('Invalid JSON: ' + e.message, true); }
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
let _modalSaveFn;
function openModal(title, sub, bodyHTML, saveFn) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-sub').textContent = sub;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.replace('hidden', 'flex');
  _modalSaveFn = saveFn;
  document.getElementById('modal-save-btn').onclick = saveFn;
}
function closeModal() { document.getElementById('modal-overlay').classList.replace('flex', 'hidden'); }
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === document.getElementById('modal-overlay')) closeModal(); });

// ─── IMPORT / EXPORT ─────────────────────────────────────────────────────────
function exportJSON() {
  const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'J1U_CMF_Data_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  toast('JSON exported!');
}
function importJSON(e) {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = ev => {
    try {
      DATA = JSON.parse(ev.target.result);
      saveData();
      toast('Data imported successfully!');
      renderPage(document.querySelector('.nav-item.active').id.replace('nav-', ''));
    } catch (err) { toast('Import failed: ' + err.message, true); }
  };
  r.readAsText(file);
  e.target.value = '';
}

function saveAll() {
  DATA.notes = document.getElementById('notes-editor').value || DATA.notes;
  saveData();
  toast('All data saved! Dashboard will reflect changes.');
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function toast(msg, isError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  if (isError) {
    t.classList.replace('bg-ok', 'bg-risk');
    t.classList.replace('text-black', 'text-white');
  } else {
    t.classList.replace('bg-risk', 'bg-ok');
    t.classList.replace('text-white', 'text-black');
  }
  t.classList.remove('translate-y-[80px]');
  setTimeout(() => { t.classList.add('translate-y-[80px]'); }, 3000);
}

// ─── THEME TOGGLE ──────────────────────────────────────────────────────────────
function applyTheme(light) {
  document.documentElement.classList.toggle('light', light);
  document.getElementById('t-icon').textContent = light ? '🌙' : '☀️';
  document.getElementById('t-label').textContent = light ? 'Dark Mode' : 'Light Mode';
}
function toggleTheme() {
  const goLight = !document.documentElement.classList.contains('light');
  applyTheme(goLight);
  try { localStorage.setItem('j1u_theme', goLight ? 'light' : 'dark'); } catch (e) { }
}

// ─── INITIALIZE ────────────────────────────────────────────────────────────────
(async function () {
  await loadInitialData();
  loadData();
  try { const saved = localStorage.getItem('j1u_theme'); if (saved === 'light') applyTheme(true); } catch (e) { }
  showPage('overview');
})();
