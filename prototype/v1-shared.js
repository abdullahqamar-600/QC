/* ============================================================
   V1 SHARED RUNTIME
   Loaded only by V1 pages. Exposes globals used by each page's
   own inline <script> tag.
   ============================================================ */

/* ── Stage metadata ── */
const STAGE_ORDER  = ['ingest', 'classify', 'qc-check', 'code-map', 'report-gen', 'uw-report'];
const STAGE_LABELS = {
  'ingest':     'Ingest',
  'classify':   'Classify',
  'qc-check':   'QC Check',
  'code-map':   'Code Map',
  'report-gen': 'Report Gen',
  'uw-report':  'UW Report',
};
const STAGE_AVG_SEC = {
  'ingest':      28,
  'classify':    62,
  'qc-check':   164,
  'code-map':    91,
  'report-gen':  68,
  'uw-report':  110,
};

/* ── SVG icon constants ── */
const ICON_CHECK_DWR = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_X_DWR     = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const ICON_SPIN_DWR  = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="2" stroke-dasharray="8 24" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 7 7" to="360 7 7" dur="0.8s" repeatCount="indefinite"/></circle></svg>`;
const FILE_SVG_DWR   = `<svg viewBox="0 0 48 60" fill="none">
  <path d="M6 0h26l10 10v46a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill="#fff" stroke="#e5e7eb" stroke-width="1.2"/>
  <path d="M32 0v6a4 4 0 0 0 4 4h6" stroke="#e5e7eb" stroke-width="1.2" fill="#f9fafb"/>
</svg>`;

/* ── Formatters ── */
function fmtMMSS(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ── Drawer step row renderer (shared by all V1 drawers) ── */
function stepHTMLDwr(s) {
  const icons = { done: ICON_CHECK_DWR, running: ICON_SPIN_DWR, todo: '', error: ICON_X_DWR };
  const durPill = (s.dur && s.status === 'done') ? `<div class="step-dur-pill">${s.dur}</div>` : '';
  const subClass = s.status === 'running' ? 'running' : s.status === 'error' ? 'error' : '';
  return `
    <div class="pipeline-step">
      <div class="step-col-icon">
        <div class="step-icon ${s.status}">${icons[s.status] || ''}</div>
      </div>
      <div class="step-col-body">
        <div class="step-name-row">
          <span class="step-name ${s.status}">${s.name}</span>
          ${s.time ? `<span class="step-name-time">${s.time}</span>` : ''}
        </div>
        <div class="step-sub ${subClass}">${s.sub}</div>
      </div>
      <div class="step-col-time">${durPill}</div>
    </div>`;
}

/* ── File-card renderer (drawer source/output files) ── */
function fileCardHTML(f) {
  const badge    = f.flags ? `<span class="file-card-badge">${f.flags}</span>` : '';
  const flagText = f.flags ? `<div class="file-card-flags">${f.flags} flag${f.flags > 1 ? 's' : ''} to review</div>` : '';
  const meta     = f.meta  ? `<div class="file-card-meta">${f.meta}</div>` : '';
  return `
    <div class="file-card">
      ${badge}
      <div class="file-card-icon">
        ${FILE_SVG_DWR}
        <span class="file-card-type ${f.type}">${f.type.toUpperCase()}</span>
      </div>
      <div class="file-card-name">${f.name}</div>
      ${meta}
      ${flagText}
    </div>`;
}

/* ── Drawer close (shared) ── */
function closeDrawer() {
  document.getElementById('drawerOverlay').classList.remove('is-open');
  document.getElementById('drawerPanel').classList.remove('is-open');
}

/* ── Search dropdown installer ──────────────────────────────
   Each V1 page calls installSearch({ ... }) once on load to
   wire up the topbar search input + dropdown. The page supplies:

     getMatches(query) → array of items (max 8)
     renderRow(item, index) → HTML for one .search-result-row
     onSelect(item) → handler when a row is clicked or Enter-ed
     emptyLabel(query) → text shown when no matches

   The installer owns the keyboard navigation, click-away handler,
   and the global "/" focus shortcut.
   ──────────────────────────────────────────────────────────── */
function installSearch({ getMatches, renderRow, onSelect, emptyLabel }) {
  const input   = document.getElementById('loanSearch');
  const results = document.getElementById('searchResults');
  if (!input || !results) return;

  let activeIndex = -1;
  let currentMatches = [];

  function render() {
    currentMatches = getMatches(input.value);
    activeIndex = -1;
    if (!currentMatches.length) {
      results.innerHTML = `<div class="search-empty">${emptyLabel(input.value)}</div>`;
    } else {
      results.innerHTML = currentMatches.map((item, i) => renderRow(item, i)).join('');
    }
    results.classList.add('is-open');
  }

  function moveActive(delta) {
    const rows = results.querySelectorAll('.search-result-row');
    if (!rows.length) return;
    activeIndex = delta > 0
      ? Math.min(rows.length - 1, activeIndex + 1)
      : Math.max(0, activeIndex - 1);
    rows.forEach((r, i) => r.classList.toggle('is-active', i === activeIndex));
    if (rows[activeIndex]) rows[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  function selectAndClose(item) {
    results.classList.remove('is-open');
    input.blur();
    onSelect(item);
  }

  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      results.classList.remove('is-open');
      input.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveActive(+1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === 'Enter') {
      const target = currentMatches[activeIndex] || currentMatches[0];
      if (target) selectAndClose(target);
    }
  });

  results.addEventListener('click', (e) => {
    const row = e.target.closest('.search-result-row');
    if (!row) return;
    const idx = Number(row.dataset.idx);
    const target = currentMatches[idx];
    if (target) selectAndClose(target);
  });

  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('.search-wrap-top');
    if (wrap && !wrap.contains(e.target)) {
      results.classList.remove('is-open');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      input.focus();
    }
  });
}

/* ── Global Esc → closeDrawer ── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDrawer();
});
