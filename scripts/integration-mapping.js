// Integration detail: Workday → Esevel field mapping with a live preview of one sample record

(function initFieldMapping() {
  const $ = id => document.getElementById(id);
  const escapeHtml = v => String(v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  const ESEVEL_FIELDS = [
    ['employeeId', 'Employee ID'],
    ['firstName', 'First name'],
    ['workEmail', 'Work email'],
    ['personalEmail', 'Personal email'],
    ['department', 'Department'],
    ['costCentre', 'Cost centre'],
    ['startDate', 'Start date'],
    ['endDate', 'Last working day'],
    ['phone', 'Phone'],
    ['country', 'Work country']
  ];
  const fieldLabel = key => (ESEVEL_FIELDS.find(f => f[0] === key) || [])[1];
  const isDate = key => key === 'startDate' || key === 'endDate';

  // review: why the system flagged it; cleared once someone confirms or changes the mapping
  const SAVED = [
    { source: 'Employee_ID', sample: 'W-10482', target: 'employeeId', required: true },
    { source: 'Legal_First_Name', sample: 'Wei Jie', target: 'firstName', required: true },
    { source: 'Primary_Work_Email', sample: 'weijie.lim@techglobal.com', target: 'workEmail', required: true },
    { source: 'Supervisory_Organization', sample: 'Engineering – Platform', target: 'department', required: false },
    { source: 'Cost_Center', sample: 'CC-4410 Platform Eng', target: 'costCentre', required: false, review: 'Code and name are combined. Esevel stores the code only.' },
    { source: 'Hire_Date', sample: '2026-11-03', target: 'startDate', required: true },
    { source: 'Termination_Date', sample: '', target: 'endDate', required: true, review: 'Empty on most records. Offboarding is only created when it\'s set.' },
    { source: 'Work_Phone', sample: '+65 9123 4567', target: '', required: false }
  ];

  let rows = SAVED.map(r => ({ ...r }));
  let saved = JSON.stringify(rows);

  const statusOf = r => {
    if (!r.target) return 'unmapped';
    if (r.review || rows.some(o => o !== r && o.target === r.target)) return 'review';
    return 'mapped';
  };

  const fmtDate = s => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  function previewValue(r) {
    if (!r.sample) return '<span class="text-muted">Not set</span>';
    if (isDate(r.target) && /^\d{4}-\d{2}-\d{2}$/.test(r.sample)) return fmtDate(r.sample);
    if (r.target === 'costCentre') return escapeHtml(r.sample.split(' ')[0]);
    return escapeHtml(r.sample);
  }

  function render() {
    const STATUS = {
      mapped: '<span class="badge badge-success badge-sm">Mapped</span>',
      unmapped: '<span class="badge badge-neutral badge-sm">Unmapped</span>',
      review: '<span class="badge badge-warning badge-sm">Needs review</span>'
    };
    $('fmRows').innerHTML = rows.map((r, i) => {
      const s = statusOf(r);
      const dup = r.target && rows.some(o => o !== r && o.target === r.target);
      const note = dup ? 'Another source field already maps here.' : r.review;
      return `<tr class="${s === 'unmapped' && r.required ? 'mapping-row-missing' : ''}">
        <td><code class="source-field">${r.source}</code></td>
        <td>${r.sample ? escapeHtml(r.sample) : '<span class="text-muted">(empty)</span>'}</td>
        <td>
          <select class="form-select mapping-select" data-i="${i}" aria-label="Esevel field for ${r.source}">
            <option value="">Don't sync</option>
            ${ESEVEL_FIELDS.map(([k, l]) => `<option value="${k}" ${k === r.target ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </td>
        <td>${r.required ? '<span class="tag tag-required">Required</span>' : '<span class="text-muted">Optional</span>'}</td>
        <td>
          ${STATUS[s]}
          ${note ? `<div class="mapping-note">${escapeHtml(note)}${r.review && !dup ? ` <button type="button" class="link-sm btn-text" data-confirm="${i}">Confirm</button>` : ''}</div>` : ''}
        </td>
      </tr>`;
    }).join('');

    const counts = { mapped: 0, unmapped: 0, review: 0 };
    rows.forEach(r => counts[statusOf(r)]++);
    $('fmSummary').textContent = `${counts.mapped} mapped · ${counts.review} needs review · ${counts.unmapped} unmapped`;

    $('fmPreview').innerHTML = rows.filter(r => r.target).map(r => `
      <div class="preview-row ${statusOf(r) === 'review' ? 'preview-review' : ''}">
        <dt>${fieldLabel(r.target)}</dt>
        <dd>${previewValue(r)}</dd>
      </div>`).join('') || '<div class="text-muted">No fields mapped</div>';

    const dirty = JSON.stringify(rows) !== saved;
    $('fmDiscard').disabled = !dirty;
    $('fmSave').disabled = !dirty;
  }

  $('fmRows').addEventListener('change', e => {
    const sel = e.target.closest('.mapping-select');
    if (!sel) return;
    const r = rows[sel.dataset.i];
    r.target = sel.value;
    delete r.review;
    $('fmSaved').hidden = true;
    $('fmError').hidden = true;
    render();
  });

  $('fmRows').addEventListener('click', e => {
    const b = e.target.closest('[data-confirm]');
    if (!b) return;
    delete rows[b.dataset.confirm].review;
    $('fmSaved').hidden = true;
    render();
  });

  $('fmDiscard').addEventListener('click', () => {
    rows = JSON.parse(saved);
    $('fmError').hidden = true;
    $('fmSaved').hidden = true;
    render();
  });

  $('fmSave').addEventListener('click', () => {
    const missing = rows.filter(r => r.required && !r.target).map(r => r.source);
    const dupes = rows.some(r => r.target && rows.some(o => o !== r && o.target === r.target));
    const msg = missing.length ? `Map required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`
      : dupes ? 'Two source fields map to the same Esevel field.' : '';
    $('fmError').textContent = msg;
    $('fmError').hidden = !msg;
    if (msg) return;
    saved = JSON.stringify(rows);
    const review = rows.filter(r => statusOf(r) === 'review').length;
    $('fmSaved').textContent = `✓ Mapping saved. Applies from the next sync${review ? ` · ${review} still need${review === 1 ? 's' : ''} review` : ''}.`;
    $('fmSaved').hidden = false;
    render();
  });

  render();
})();
