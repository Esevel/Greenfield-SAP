// Device transformation actions (help center: Inventory › Device transformation actions):
// Re-assign, Change ownership, Store, Redeploy, Dispose, Archive and Depreciation report.
// These are unbilled record changes on the asset — distinct from billed service requests. Store / Redeploy /
// Dispose offer both: update the record only (client handles logistics) or raise the billed request in Services.
// Changes last for the page view (prototype). Needs role-access.js (IT & CS roles act; others read-only).

function initAssetActions() {
  const host = document.querySelector('.asset-header .header-actions');
  if (!host) return;
  const canAct = !!(window.RoleAccess && RoleAccess.canCreateLifecycle());
  if (!canAct) return;
  const editBtn = host.querySelector('.btn-primary');
  if (editBtn) editBtn.remove();
  // Not .dropdown-toggle: navigation.js's initDropdowns would attach a second toggle listener and cancel ours
  host.insertAdjacentHTML('beforeend', `<div class="dropdown">
      <button class="btn btn-primary" id="aaActions">Actions ▾</button>
      <div class="dropdown-menu dropdown-menu-right">
        <a href="#" class="dropdown-menu-item" data-act="reassign">Re-assign to another employee</a>
        <a href="#" class="dropdown-menu-item" data-act="ownership">Change ownership (entity)</a>
        <a href="#" class="dropdown-menu-item" data-act="store">Store…</a>
        <a href="#" class="dropdown-menu-item" data-act="redeploy">Redeploy…</a>
        <a href="#" class="dropdown-menu-item" data-act="dispose">Dispose…</a>
        <a href="#" class="dropdown-menu-item" data-act="depreciation">Download depreciation report</a>
        <a href="#" class="dropdown-menu-item" data-act="archive">Archive asset</a>
      </div>
    </div>`);

  const $ = s => document.querySelector(s);
  const serial = () => $('.asset-header-meta .asset-serial')?.textContent.trim();
  const statusBadge = () => $('.asset-header-meta .badge');
  const actor = () => (window.RoleAccess && RoleAccess.userById()?.name) || 'Esevel admin';

  /* ---------- Minimal dialog (same look as the shared modal) ---------- */
  function dialog({ title, text = '', body = '', fields = [], confirm = 'Confirm', danger = false }) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'modal-overlay show';
      const field = f => {
        if (f.type === 'textarea') return `<div class="form-group"><label class="form-label" for="aad-${f.id}">${f.label}${f.required ? ' *' : ''}</label><textarea class="form-textarea" id="aad-${f.id}" rows="2" placeholder="${escapeHtml(f.placeholder || '')}"></textarea></div>`;
        if (f.type === 'select') return `<div class="form-group"><label class="form-label" for="aad-${f.id}">${f.label}${f.required ? ' *' : ''}</label><select class="form-select" id="aad-${f.id}">${f.options.map(o => `<option>${escapeHtml(o)}</option>`).join('')}</select></div>`;
        if (f.type === 'radio') return `<div class="form-group"><span class="form-label">${f.label}</span>${f.options.map(([v, l, note], i) => `<label class="check-option aad-radio"><input type="radio" name="aad-${f.id}" value="${v}" ${i === 0 ? 'checked' : ''}> <span><strong>${l}</strong>${note ? `<span class="text-muted"> — ${note}</span>` : ''}</span></label>`).join('')}</div>`;
        return `<div class="form-group"><label class="form-label" for="aad-${f.id}">${f.label}${f.required ? ' *' : ''}</label><input class="form-input" id="aad-${f.id}" placeholder="${escapeHtml(f.placeholder || '')}"></div>`;
      };
      wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header"><h3 class="modal-title">${escapeHtml(title)}</h3><button type="button" class="modal-close" data-x aria-label="Close">&times;</button></div>
        <div class="modal-body">${text ? `<p>${text}</p>` : ''}${body}${fields.map(field).join('')}<div class="form-error" id="aadErr" hidden></div></div>
        <div class="modal-footer"><button type="button" class="btn btn-secondary" data-x>Cancel</button><button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${escapeHtml(confirm)}</button></div>
      </div>`;
      document.body.appendChild(wrap);
      const close = v => { wrap.remove(); resolve(v); };
      wrap.addEventListener('click', e => {
        if (e.target === wrap || e.target.closest('[data-x]')) return close(null);
        if (!e.target.closest('[data-ok]')) return;
        const vals = {};
        fields.forEach(f => {
          vals[f.id] = f.type === 'radio' ? wrap.querySelector(`input[name="aad-${f.id}"]:checked`)?.value : wrap.querySelector(`#aad-${f.id}`)?.value.trim();
        });
        const missing = fields.find(f => f.required && !vals[f.id]);
        if (missing) { const err = wrap.querySelector('#aadErr'); err.hidden = false; err.textContent = `${missing.label} is required.`; return; }
        close(vals);
      });
      wrap.querySelector('input, textarea, select')?.focus();
    });
  }

  /* ---------- Record the change: status badge, timeline entry, last-edited ---------- */
  function applyChange({ title, before, after, note = '', badge = null }) {
    if (badge) {
      const b = statusBadge();
      b.className = `badge ${badge[1]}`;
      b.textContent = badge[0];
    }
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const timeline = document.querySelector('.timeline');
    if (timeline) {
      timeline.insertAdjacentHTML('afterbegin', `<div class="timeline-item" data-client-initiated="false">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-head"><strong>${escapeHtml(title)}</strong><span class="channel-tag">UI</span></div>
          <div class="timeline-meta">Today, ${now} · ${escapeHtml(actor())} · Esevel admin</div>
          ${before || after ? `<div class="before-after"><span class="strikethrough">${escapeHtml(before)}</span> → <strong>${escapeHtml(after)}</strong></div>` : ''}
          ${note ? `<div class="timeline-meta">${escapeHtml(note)}</div>` : ''}
        </div>
      </div>`);
    }
    const edited = document.querySelector('.last-edited');
    if (edited) edited.innerHTML = `Last edited by <strong>${escapeHtml(actor())}</strong> · just now`;
    let toast = document.getElementById('aaActionToast');
    if (!toast) {
      toast = Object.assign(document.createElement('div'), { id: 'aaActionToast', className: 'asset-add-success' });
      document.querySelector('.asset-header').after(toast);
    }
    toast.textContent = `✓ ${title}. Recorded on the asset — no service billed.`;
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, 6000);
  }

  // Store / Redeploy / Dispose: record-only change, or hand off to the billed request form
  async function transformOrRequest(act) {
    const meta = {
      store: { label: 'Store', done: 'Stored', badge: ['In storage', 'badge-info'], reqType: 'storage', recordNote: 'Marks the device as stored at a client location. No Esevel storage fees.' },
      redeploy: { label: 'Redeploy', done: 'Redeployed', badge: ['Deployed', 'badge-success'], reqType: 'redeployment', recordNote: 'Records a new holder. The client moves the device themselves.' },
      dispose: { label: 'Dispose', done: 'Disposed', badge: ['Retired', 'badge-muted'], reqType: 'disposal', recordNote: 'Marks the device disposed by the client. No wipe certificate is issued.' }
    }[act];
    const v = await dialog({
      title: `${meta.label} · ${serial()}`,
      fields: [
        { id: 'mode', label: 'How is this handled?', type: 'radio', options: [
          ['record', 'Update the record only', meta.recordNote],
          ['service', 'Raise an Esevel service request', 'Opens Services › New request — collection, processing and billing apply']
        ] },
        ...(act === 'redeploy' ? [{ id: 'to', label: 'New holder', required: true, placeholder: 'Employee name' }] : []),
        { id: 'note', label: 'Note', type: 'textarea', placeholder: 'e.g. Client keeps spares on site' }
      ],
      confirm: meta.label
    });
    if (!v) return;
    if (v.mode === 'service') { window.location.href = `/pages/services/new.html?type=${meta.reqType}`; return; }
    const before = statusBadge().textContent;
    applyChange({
      title: `${meta.done} (record only)`, before, after: meta.badge[0],
      note: v.to ? `New holder: ${v.to}. ${v.note || ''}` : v.note, badge: meta.badge
    });
  }

  async function reassign() {
    const v = await dialog({
      title: `Re-assign · ${serial()}`,
      text: 'Moves the device to another employee at the same client. For managed devices, the MDM user binding updates on the next sync; unmanaged devices are record-only.',
      fields: [
        { id: 'to', label: 'New employee', required: true, placeholder: 'Employee name' },
        { id: 'note', label: 'Note', type: 'textarea', placeholder: 'e.g. Previous holder moved teams' }
      ],
      confirm: 'Re-assign'
    });
    if (!v) return;
    applyChange({ title: 'Re-assigned', before: 'Previous holder', after: v.to, note: v.note, badge: ['Deployed', 'badge-success'] });
  }

  async function ownership() {
    const entities = ['Same client · parent entity', 'Same client · subsidiary', 'Transfer to employee (buy-out)'];
    const v = await dialog({
      title: `Change ownership · ${serial()}`,
      text: 'Moves the asset between the client\'s billing entities, or transfers it to the employee. Book value follows the depreciation schedule.',
      fields: [
        { id: 'to', label: 'New owner', type: 'select', options: entities },
        { id: 'note', label: 'Note', type: 'textarea', placeholder: 'e.g. Entity restructure' }
      ],
      confirm: 'Change ownership'
    });
    if (!v) return;
    applyChange({ title: 'Ownership changed', before: 'Current entity', after: v.to, note: v.note });
  }

  async function archive() {
    const v = await dialog({
      title: `Archive · ${serial()}`,
      text: 'Removes the asset from active views. Archived assets keep their history and can be restored by Customer Support. Use this for lost, written-off or duplicate records — not for disposals.',
      fields: [{ id: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'e.g. Written off after loss report' }],
      confirm: 'Archive asset', danger: true
    });
    if (!v) return;
    applyChange({ title: 'Archived', before: statusBadge().textContent, after: 'Archived', note: v.reason, badge: ['Archived', 'badge-muted'] });
  }

  function depreciation() {
    const model = document.querySelector('.page-title-edit').textContent.trim();
    const rows = [
      ['Serial', 'Model', 'Purchase date', 'Purchase value', 'Method', 'Period', 'Monthly depreciation', 'Book value today'],
      [serial(), model, '2024-03-01', 'USD 2,100.00', 'Straight-line', '36 months', 'USD 58.33', 'USD 950.00']
    ];
    const cell = s => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const a = document.createElement('a');
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent('\ufeff' + rows.map(r => r.map(cell).join(',')).join('\r\n'))}`;
    a.download = `depreciation-${serial()}.csv`;
    a.click();
  }

  // Self-wired toggle: navigation.js's initDropdowns may have already run before this menu existed
  const toggle = document.getElementById('aaActions');
  const menu = host.querySelector('.dropdown-menu');
  toggle.addEventListener('click', e => {
    e.stopPropagation();
    document.querySelectorAll('.dropdown-menu.show').forEach(m => { if (m !== menu) m.classList.remove('show'); });
    menu.classList.toggle('show');
  });
  document.addEventListener('click', () => menu.classList.remove('show'));

  host.querySelector('.dropdown-menu').addEventListener('click', e => {
    const item = e.target.closest('[data-act]');
    if (!item) return;
    e.preventDefault();
    const act = item.dataset.act;
    if (act === 'reassign') reassign();
    else if (act === 'ownership') ownership();
    else if (act === 'archive') archive();
    else if (act === 'depreciation') depreciation();
    else transformOrRequest(act);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAssetActions);
} else {
  initAssetActions();
}
