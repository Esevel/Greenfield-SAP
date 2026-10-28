// Asset detail page interactions

function initAssetDetail() {
  adoptAssetFromQuery();
  renderRelatedAssetTickets();
  renderDeviceManagementCard();
  const filter = document.getElementById('clientInitiatedFilter');
  if (!filter) return;

  filter.addEventListener('change', () => {
    document.querySelectorAll('.timeline-item').forEach(item => {
      const isClient = item.dataset.clientInitiated === 'true';
      item.style.display = filter.checked && !isClient ? 'none' : '';
    });
  });
}

// The console links here with ?serial=&model=&client=… — adopt that identity in the header so the
// (single prototype) detail page reflects the asset that was clicked.
function adoptAssetFromQuery() {
  const q = new URLSearchParams(location.search);
  const serial = q.get('serial');
  if (!serial) return;
  const meta = document.querySelector('.asset-header-meta');
  meta.querySelector('.asset-serial').textContent = serial;
  if (q.get('model')) {
    document.querySelector('.page-title-edit').textContent = q.get('model');
    document.title = `${q.get('model')} · ${serial} - Admin Portal`;
  }
  const clientCell = meta.querySelector('.client-cell');
  if (q.get('client') && clientCell) {
    clientCell.querySelector('.client-logo').textContent = q.get('logo') || q.get('client').slice(0, 2).toUpperCase();
    clientCell.childNodes[clientCell.childNodes.length - 1].textContent = ` ${q.get('client')}`;
  }
  const geoSpan = clientCell?.nextElementSibling?.nextElementSibling;
  if (q.get('geo') && geoSpan) geoSpan.textContent = q.get('geo');
  const statusBadge = meta.querySelector('.badge');
  if (q.get('status') && statusBadge) {
    const cls = { Deployed: 'badge-success', 'In storage': 'badge-info', 'In transit': 'badge-info', 'In repair': 'badge-warning', Retired: 'badge-muted' }[q.get('status')] || 'badge-neutral';
    statusBadge.className = `badge ${cls}`;
    statusBadge.textContent = q.get('status');
  }
}

// Device management card in the sidebar: enrolment state for managed devices (mdm-data.js),
// or the plan-gated note when the client's plan doesn't include MDM.
function renderDeviceManagementCard() {
  const root = document.getElementById('assetMdmCard');
  if (!root || typeof MDM_DEVICES === 'undefined') return;
  const serial = document.querySelector('.asset-header-meta .asset-serial')?.textContent.trim();
  let d = MDM_DEVICES.find(x => x.serial === serial);
  if (!d) {
    const q = new URLSearchParams(location.search);
    const clientName = q.get('client') || document.querySelector('.asset-header-meta .client-cell')?.textContent.trim();
    const clientId = (WH_CLIENTS.find(c => c.name === clientName) || {}).id;
    const reason = mdmGapReason(clientId, q.get('category') || 'Laptops', q.get('status') || document.querySelector('.asset-header-meta .badge')?.textContent.trim());
    if (reason === 'no-plan') {
      root.innerHTML = `<div class="card-header"><h3 class="card-title">Device management</h3></div>
        <div class="card-body"><div class="readonly-note">Not MDM-managed. Device management is part of the Secure and Complete plans.</div></div>`;
      return;
    }
    if (reason === 'not-applicable') {
      root.innerHTML = `<div class="card-header"><h3 class="card-title">Device management</h3></div>
        <div class="card-body"><div class="readonly-note">Not applicable — the MDM agent runs on computers; peripherals and monitors aren't enrolled.</div></div>`;
      return;
    }
    const p = MDM_PLATFORMS[CLIENT_MDM[clientId]];
    if (reason === 'pre-deployment') {
      root.innerHTML = `<div class="card-header"><h3 class="card-title">Device management</h3><span class="badge badge-neutral">Enrols at deployment</span></div>
        <div class="card-body"><div class="readonly-note">${p.name} is set up during provisioning when this device is deployed to an employee.</div></div>`;
      return;
    }
    // Deployed computer at an MDM client with no record: a coverage gap. The platform's action is to
    // trigger enrolment (create the user in the MDM, which sends the activation email) — not to track it by hand.
    const canStart = !!(window.RoleAccess && RoleAccess.canCreateLifecycle());
    root.innerHTML = `<div class="card-header"><h3 class="card-title">Device management</h3><span class="badge badge-error">Not enrolled</span></div>
      <div class="card-body">
        <div class="readonly-note">This device should be managed: ${escapeHtml(clientName)} runs ${p.name}, but it has never appeared in ${p.name}. The device is unprotected until it enrols.</div>
        ${canStart ? `<button type="button" class="btn btn-primary btn-sm" id="assetMdmStart">Send activation</button>` : ''}
      </div>`;
    const start = document.getElementById('assetMdmStart');
    if (start) start.addEventListener('click', () => {
      start.replaceWith(Object.assign(document.createElement('div'), {
        className: 'readonly-note',
        innerHTML: `✓ User created in ${p.name} and activation email sent. The device appears here as <strong>Invited</strong> on the next directory sync.`
      }));
    });
    return;
  }
  const p = MDM_PLATFORMS[CLIENT_MDM[d.client]];
  const canAct = !!(window.RoleAccess && RoleAccess.canCreateLifecycle());
  const draw = () => {
    const [label, badge] = MDM_STATES[d.state];
    const sync = MDM_LAST_SYNC[CLIENT_MDM[d.client]];
    root.innerHTML = `<div class="card-header"><h3 class="card-title">Device management</h3><span class="badge ${badge}">${label}</span></div>
      <div class="card-body"><div class="info-grid">
        <div class="info-row"><span class="info-label">Platform</span><span class="info-value">${p.name}</span></div>
        <div class="info-row"><span class="info-label">Method</span><span class="info-value">${MDM_METHODS[d.method]}</span></div>
        <div class="info-row"><span class="info-label">OS</span><span class="info-value">${escapeHtml(d.os)} ${escapeHtml(d.osVersion)}</span></div>
        <div class="info-row"><span class="info-label">Last check-in</span><span class="info-value">${d.lastCheckin ? new Date(d.lastCheckin).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never'}</span></div>
        ${d.byod ? '<div class="info-row"><span class="info-label">Ownership</span><span class="info-value">BYOD</span></div>' : ''}
      </div>
      ${d.blocker ? `<div class="text-error">${escapeHtml(d.blocker)}</div>` : ''}
      <div class="readonly-note">Status synced from <a href="/pages/integrations/list.html" class="link-sm">${p.name}</a> · last sync ${sync} · <button type="button" class="btn-text" id="assetMdmSync">Sync now</button></div>
      ${canAct && d.state === 'enrolled' ? `<button type="button" class="btn btn-primary btn-sm" id="assetMdmVerify">Verify onboarding complete</button><div class="input-helper">Confirms policies, MFA and apps landed on this device (checked in ${p.name}).</div>` : ''}</div>`;
    // "Sync now" simulates the MDM reporting progress: telemetry states advance, verification never does
    const syncBtn = document.getElementById('assetMdmSync');
    if (syncBtn) syncBtn.addEventListener('click', () => {
      const next = mdmNextTelemetryStep(d);
      if (next) {
        d.state = next;
        if (next === 'enrolled') d.lastCheckin = new Date().toISOString().slice(0, 16);
      }
      draw();
    });
    const verify = document.getElementById('assetMdmVerify');
    if (verify) verify.addEventListener('click', () => { d.state = 'verified'; draw(); });
  };
  draw();
}

function renderRelatedAssetTickets() {
  const serial = document.querySelector('.asset-header-meta .asset-serial')?.textContent.trim();
  const ticketBody = document.getElementById('assetRelatedTickets');
  if (!serial || !ticketBody || typeof TRACKER_ITEMS === 'undefined') return;

  const related = TRACKER_ITEMS.filter(item => (item.assetSerials || []).includes(serial)).map(item => ({ item, sla: trackerSla(item) }));
  related.sort((a, b) => new Date(b.item.start) - new Date(a.item.start));
  const typeLabels = { repair: 'Repair', support: 'Support', onboarding: 'Onboarding', offboarding: 'Offboarding', redeploy: 'Redeployment', storage: 'Storage', disposal: 'Disposal' };
  const ticketHref = item => item.href || (item.type === 'onboarding'
    ? `/pages/services/onboarding-detail.html?id=${encodeURIComponent(item.id)}`
    : item.type === 'support' ? '/pages/support/ticket.html' : `/pages/services/work-order.html?wo=${encodeURIComponent(item.id)}`);
  const opened = value => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const rowHtml = ({ item, sla }) => `<tr>
    <td><a class="link-sm" href="${ticketHref(item)}">${escapeHtml(item.id)}</a></td>
    <td>${escapeHtml(typeLabels[item.type] || item.type)}</td>
    <td><span class="badge ${sla.cur ? 'badge-info' : 'badge-neutral'} badge-sm">${escapeHtml(sla.cur ? item.stage || sla.cur.m.label : 'Completed')}</span></td>
    <td>${opened(item.start)}</td>
    <td>${escapeHtml(item.owner?.[1] || '—')}</td>
  </tr>`;

  ticketBody.innerHTML = related.map(rowHtml).join('')
    || '<tr><td colspan="5" class="text-muted sla-empty">No tracker tickets linked to this asset.</td></tr>';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAssetDetail);
} else {
  initAssetDetail();
}
