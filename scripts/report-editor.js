// Monthly service report editor: charts, section toggles, commentary, save/export/issue

const RP_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
const RP_VOLUME = {
  Support: [62, 70, 66, 74, 79, 84],
  Orders: [24, 30, 27, 25, 28, 30],
  'On/offboarding': [10, 12, 9, 11, 15, 21],
  Repairs: [8, 6, 9, 7, 9, 7]
};
const RP_COLORS = { Support: '#3b82f6', Orders: '#22c55e', 'On/offboarding': '#a855f7', Repairs: '#f59e0b' };
const RP_SLA = [94.8, 96.1, 97.3, 96.9, 97.7, 96.5];
const RP_RESPONSE = [44, 41, 39, 36, 35, 38]; // minutes
const RP_RESOLUTION = [7.4, 6.9, 6.5, 6.2, 5.8, 6.2]; // hours

function initReportEditor() {
  const $ = id => document.getElementById(id);
  let dirty = false;
  let issued = false;

  // Stacked bar chart for ticket volume
  const totals = RP_MONTHS.map((_, i) => Object.values(RP_VOLUME).reduce((s, v) => s + v[i], 0));
  const maxTotal = Math.ceil(Math.max(...totals) / 50) * 50;
  $('volumeChart').innerHTML = RP_MONTHS.map((m, i) => `
    <div class="bar-col ${i === RP_MONTHS.length - 1 ? 'current' : ''}">
      <div class="bar-total">${totals[i]}</div>
      <div class="bar-stack" style="height: ${(totals[i] / maxTotal) * 100}%;">
        ${Object.entries(RP_VOLUME).map(([k, v]) => `<div class="bar-seg" style="flex: ${v[i]}; background: ${RP_COLORS[k]};" title="${k}: ${v[i]}"></div>`).join('')}
      </div>
      <div class="bar-label">${m}</div>
    </div>`).join('');
  $('volumeLegend').innerHTML = Object.keys(RP_VOLUME).map(k => `<span><span class="legend-dot" style="background: ${RP_COLORS[k]};"></span>${k} ${RP_VOLUME[k][5]}</span>`).join('');

  // Line chart for SLA compliance with the 95% target
  const W = 560, H = 180, P = { l: 36, r: 16, t: 14, b: 26 };
  const yMin = 90, yMax = 100;
  const x = i => P.l + (i * (W - P.l - P.r)) / (RP_MONTHS.length - 1);
  const y = v => P.t + ((yMax - v) / (yMax - yMin)) * (H - P.t - P.b);
  const grid = [90, 95, 100].map(v => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" class="${v === 95 ? 'target-line' : 'grid-line'}"/><text x="${P.l - 6}" y="${y(v) + 4}" class="axis-text" text-anchor="end">${v}%</text>`).join('');
  const points = RP_SLA.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  $('slaChart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="line-chart">
    ${grid}
    <text x="${W - P.r}" y="${y(95) - 6}" class="target-text" text-anchor="end">Target 95%</text>
    <polyline points="${points}" class="line-path"/>
    ${RP_SLA.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="${i === 5 ? 5 : 3.5}" class="line-dot ${i === 5 ? 'current' : ''}"><title>${RP_MONTHS[i]}: ${v}%</title></circle>
      <text x="${x(i)}" y="${y(v) - 10}" class="value-text" text-anchor="middle">${v}</text>
      <text x="${x(i)}" y="${H - 6}" class="axis-text" text-anchor="middle">${RP_MONTHS[i]}</text>`).join('')}
  </svg>`;

  // Bars and target share one scale: plot height minus the month label row
  const PLOT_PX = 80;
  const LABEL_PX = 20;
  function miniBars(el, values, fmt, target) {
    const max = Math.max(...values, target);
    el.innerHTML = values.map((v, i) => `
      <div class="mini-col ${i === values.length - 1 ? 'current' : ''}" title="${RP_MONTHS[i]}: ${fmt(v)}">
        <div class="mini-bar" style="height: ${Math.round((v / max) * PLOT_PX)}px;"></div>
        <span>${RP_MONTHS[i]}</span>
      </div>`).join('') + `<div class="mini-target" style="bottom: ${LABEL_PX + Math.round((target / max) * PLOT_PX)}px;"><span>target</span></div>`;
  }
  miniBars($('responseBars'), RP_RESPONSE, v => `${v}m`, 60);
  miniBars($('resolutionBars'), RP_RESOLUTION, v => `${Math.floor(v)}h ${Math.round((v % 1) * 60)}m`, 8);

  // Commentary renders as plain paragraphs
  function renderCommentary() {
    const text = $('commentary').value.trim();
    const box = $('previewCommentary');
    box.innerHTML = '';
    if (!text) {
      box.hidden = true;
    } else {
      box.hidden = false;
      text.split(/\n\s*\n/).forEach(para => {
        const p = document.createElement('p');
        p.textContent = para.trim();
        box.appendChild(p);
      });
    }
    $('commentaryCount').textContent = `${$('commentary').value.length} / 1200`;
  }

  function markDirty() {
    if (issued) return;
    dirty = true;
    $('savedState').textContent = 'Unsaved changes';
    $('savedState').classList.add('unsaved');
  }

  function showBanner(text, kind = 'success') {
    $('reportBanner').hidden = false;
    $('reportBanner').classList.toggle('banner-info', kind === 'info');
    $('reportBannerText').textContent = text;
  }

  $('commentary').addEventListener('input', () => { renderCommentary(); markDirty(); });

  $('sectionToggles').addEventListener('change', e => {
    const key = e.target.dataset.toggle;
    if (!key) return;
    const anyOn = [...document.querySelectorAll('[data-toggle]')].some(t => t.checked);
    if (!anyOn) {
      e.target.checked = true;
      $('sectionError').hidden = false;
      return;
    }
    $('sectionError').hidden = true;
    document.querySelector(`.rp-section[data-section="${key}"]`).hidden = !e.target.checked;
    // Collapse the two-column row if both metric sections are off
    const twoCol = document.querySelector('.rp-two-col');
    twoCol.hidden = [...twoCol.querySelectorAll('.rp-section')].every(s => s.hidden);
    markDirty();
  });

  $('saveDraft').addEventListener('click', () => {
    dirty = false;
    $('savedState').textContent = 'Draft saved just now';
    $('savedState').classList.remove('unsaved');
    $('reportStatus').className = 'badge badge-muted';
    $('reportStatus').textContent = 'Draft';
    showBanner('✓ Draft saved.');
  });

  document.querySelectorAll('[data-export]').forEach(btn => {
    btn.addEventListener('click', () => {
      const included = [...document.querySelectorAll('[data-toggle]:checked')].length;
      const kind = btn.dataset.export;
      const file = { PDF: 'acme-tech-2026-09.pdf', CSV: 'acme-tech-2026-09.csv', 'executive deck': 'acme-tech-2026-09-exec.pptx' }[kind];
      showBanner(`Exporting ${kind} (${included} section${included === 1 ? '' : 's'}${dirty ? ', including unsaved changes' : ''}) → ${file}`, 'info');
    });
  });

  // Issue flow
  const modal = $('issueModal');
  const closeModal = () => { modal.classList.remove('show'); $('issueReport').focus(); };
  $('issueReport').addEventListener('click', () => {
    const off = [...document.querySelectorAll('[data-toggle]')].filter(t => !t.checked).map(t => t.closest('label').textContent.trim());
    $('issueSections').textContent = off.length ? `Hidden sections: ${off.join(', ')}.` : 'All six sections are included.';
    modal.classList.add('show');
    $('issueConfirm').focus();
  });
  $('issueClose').addEventListener('click', closeModal);
  $('issueCancel').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('show')) closeModal(); });

  $('issueConfirm').addEventListener('click', () => {
    issued = true;
    dirty = false;
    modal.classList.remove('show');
    $('reportStatus').className = 'badge badge-success';
    $('reportStatus').textContent = 'Issued';
    $('savedState').textContent = 'Issued today by you';
    $('savedState').classList.remove('unsaved');
    $('commentary').readOnly = true;
    document.querySelectorAll('[data-toggle]').forEach(t => { t.disabled = true; });
    ['saveDraft', 'issueReport'].forEach(id => { $(id).disabled = true; });
    $('issueReport').textContent = 'Issued';
    $('footerNote').textContent = 'Issued reports are read-only. Exports are still available.';
    showBanner('✓ Report issued to Acme Tech. Ravi Shah has been notified.');
  });

  window.addEventListener('beforeunload', e => {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  renderCommentary();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReportEditor);
} else {
  initReportEditor();
}
