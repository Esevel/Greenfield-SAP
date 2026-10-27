// Needs attention: one queue across Orders, Services and Support with everything breached, at risk, blocked or
// unassigned. Orders and services come from TRACKER_ITEMS (orders join via orderTrackerItems), tickets from
// support-data.js, subscriptions and seat orders from subscription-data.js and seats-data.js. Filters: kind tabs, health tiles, client, country, owner and "mine".
// Needs tracker-sla.js, orders-engine.js and support-data.js.

(function initAttention() {
  const $ = id => document.getElementById(id);
  const KIND = { orders: ['📦', 'Orders'], services: ['🛠', 'Services'], support: ['💬', 'Support'], subscriptions: ['💳', 'Subscriptions'] };
  const KEY = 'sap-attention-filters-v1';
  const def = () => ({ kind: 'all', health: 'all', client: '', cc: '', owner: '' });
  let f;
  try { f = { ...def(), ...JSON.parse(sessionStorage.getItem(KEY) || '{}') }; } catch { f = def(); }
  const save = () => sessionStorage.setItem(KEY, JSON.stringify(f));
  const me = (window.RBAC ? RBAC.getCurrentUser().name : 'You').split(' ')[0];

  // Normalise every source into one row shape
  function items() {
    const tracker = TRACKER_ITEMS.map(item => {
      const s = trackerSla(item);
      const isOrder = !!item.order;
      const [icon, typeName] = TRACKER_TYPE_ICON[item.type];
      const blocked = !!item.blocker;
      const f2 = s.fmt || fmtHours;
      return {
        id: item.id, kind: isOrder ? 'orders' : 'services', icon, typeLabel: isOrder ? `Order · ${s.type.name}` : typeName,
        client: item.client, cc: item.cc, owner: item.owner[1], blocker: item.blocker,
        where: s.cur ? `${s.cur.m.label}` : 'Complete', sub: item.stage,
        health: s.health, ratio: s.ratio, left: (s.remaining || 0) * 60,
        timeText: !s.cur ? '—' : s.remaining < 0 ? `${f2(s.remaining)} overdue` : `${f2(s.remaining)} left`,
        note: { who: item.note[0], text: item.note[1] }, href: item.href, blocked
      };
    }).filter(r => r.health === 'breached' || r.health === 'risk' || r.blocked);
    const support = supportAttentionItems().map(r => ({ ...r, kind: 'support', typeLabel: 'Support', where: r.stage, sub: r.title, blocked: !!r.blocker, owner: r.owner || '' }));
    return [...tracker, ...support, ...subscriptionItems()];
  }

  // Seat subscriptions: renewal due, expired (grace) or restricted, and seat orders waiting for the client admin
  function subscriptionItems() {
    if (typeof subStatus !== 'function') return [];
    const rows = [];
    Object.entries(CONTRACTS).forEach(([id, k]) => {
      const st = subStatus(k);
      if (!st) return;
      const cc = parentEntity(k.terms).country;
      const href = `/pages/clients/detail.html?c=${id}#sec-subscription`;
      const base = { kind: 'subscriptions', icon: '💳', client: id, cc, owner: '', note: null, href };
      if (st.key !== 'active') {
        const days = st.key === 'due' ? st.left : st.key === 'expired' ? SUB_GRACE_DAYS - st.since : -st.since;
        rows.push({ ...base, id: `SUB-${id.toUpperCase().slice(0, 4)}`, typeLabel: `Subscription · ${k.tier}`, where: st.label, sub: st.text,
          health: st.key === 'due' ? 'risk' : 'breached', ratio: st.key === 'due' ? 1 - st.left / SUB_RENEW_WARN_DAYS : 1, left: days * 1440,
          blocker: st.key === 'due' ? '' : st.key === 'expired' ? 'Notifications paused until renewed' : 'Client access restricted',
          blocked: st.key !== 'due', timeText: st.key === 'due' ? `${st.left} days to term end` : st.key === 'expired' ? `Restricted in ${days} days` : `Restricted ${st.since - SUB_GRACE_DAYS > 0 ? `${st.since - SUB_GRACE_DAYS} days` : 'today'}` });
      }
      if (typeof seatOrdersFor === 'function') seatOrdersFor(id, 'pending').forEach(o => rows.push({ ...base, id: o.id, typeLabel: o.seat ? 'Seat order' : 'Device upgrade', where: 'Waiting for client admin',
        sub: `${seatOrderLabel(o)} for ${o.name} · ${fmtAmount(o.cur, o.amount)} one-off · onboarding on hold`, health: 'risk', ratio: 0.9, left: 0, blocker: `Approval from ${o.admin}`, blocked: true,
        timeText: `Raised ${billingDateSub(o.created)}`, href: o.pid ? `/pages/people/joiners.html?open=${o.pid}` : href }));
    });
    return rows;
  }

  const RANK = { breached: 0, risk: 1, ok: 2, complete: 3 };
  const matches = r => (f.kind === 'all' || r.kind === f.kind)
    && (f.health === 'all' || (f.health === 'blocked' ? r.blocked : f.health === 'mine' ? r.owner === me : f.health === 'unassigned' ? !r.owner : r.health === f.health))
    && (!f.client || r.client === f.client) && (!f.cc || r.cc === f.cc) && (!f.owner || (f.owner === '_none' ? !r.owner : r.owner === f.owner));

  function render() {
    const all = items();
    const inKind = all.filter(r => f.kind === 'all' || r.kind === f.kind);
    const n = fn => inKind.filter(fn).length;
    const tile = (key, label, value, cls = '') => `<button type="button" class="summary-tile summary-tile-link ${cls}${f.health === key ? ' active' : ''}" data-health="${key}" aria-pressed="${f.health === key}"><div class="summary-tile-label">${label}</div><div class="summary-tile-value">${value}</div></button>`;
    const breached = n(r => r.health === 'breached');
    const risk = n(r => r.health === 'risk');
    const blocked = n(r => r.blocked);
    const unassigned = n(r => !r.owner);
    $('naTiles').innerHTML = tile('all', 'Needs attention', inKind.length)
      + tile('breached', 'Breached', breached, breached ? 'summary-tile-breached' : '')
      + tile('risk', 'At risk', risk, risk ? 'summary-tile-alert' : '')
      + tile('blocked', 'Blocked', blocked, blocked ? 'summary-tile-alert' : '')
      + tile('unassigned', 'Unassigned', unassigned, unassigned ? 'summary-tile-alert' : '')
      + tile('mine', 'Mine', n(r => r.owner === me));

    $('naKinds').innerHTML = [['all', 'All'], ...Object.entries(KIND).map(([k, [i, l]]) => [k, `${i} ${l}`])].map(([k, l]) => `<button type="button" class="segment-button${f.kind === k ? ' active' : ''}" data-kind="${k}">${l}<span class="tab-count">${k === 'all' ? all.length : all.filter(r => r.kind === k).length}</span></button>`).join('');

    const opt = (v, l, cur) => `<option value="${escapeHtml(v)}"${v === cur ? ' selected' : ''}>${escapeHtml(l)}</option>`;
    const clients = [...new Set(all.map(r => r.client))].map(id => WH_CLIENTS.find(c => c.id === id)).filter(Boolean);
    const ccs = [...new Set(all.map(r => r.cc))];
    const owners = [...new Set(all.map(r => r.owner).filter(Boolean))].sort();
    $('naFilters').innerHTML = `<div class="filter-chips stock-filters order-filters">
      <label class="filter-select"><span>Client</span><select id="naClient">${opt('', 'All', f.client)}${clients.map(c => opt(c.id, c.name, f.client)).join('')}</select></label>
      <label class="filter-select"><span>Country</span><select id="naCc">${opt('', 'All', f.cc)}${ccs.map(cc => opt(cc, WH_COUNTRIES[cc][1], f.cc)).join('')}</select></label>
      <label class="filter-select"><span>Owner</span><select id="naOwner">${opt('', 'All', f.owner)}${opt('_none', 'Unassigned', f.owner)}${owners.map(o => opt(o, o, f.owner)).join('')}</select></label>
      <button type="button" class="btn-text" id="naReset">Reset</button>
    </div>`;

    const rows = all.filter(matches).sort((a, b) => RANK[a.health] - RANK[b.health] || (a.health === 'breached' ? a.left - b.left : b.ratio - a.ratio));
    $('naRows').innerHTML = rows.map(r => {
      const client = WH_CLIENTS.find(c => c.id === r.client) || { name: r.client };
      const [pc, pt] = HEALTH_PILL[r.health] || HEALTH_PILL.ok;
      return `<tr data-href="${r.href || ''}" tabindex="0">
        <td><span class="card-id">${r.id}</span><div class="stock-sub attention-kind">${r.icon} ${escapeHtml(r.typeLabel)}</div></td>
        <td>${escapeHtml(client.name)}<div class="stock-sub">${WH_COUNTRIES[r.cc][0]} ${r.cc}</div></td>
        <td><strong>${escapeHtml(r.where)}</strong>${r.sub && r.sub !== r.where ? `<div class="stock-sub">${escapeHtml(r.sub)}</div>` : ''}</td>
        <td>${r.owner ? `<div class="owner-cell"><span class="card-avatar">${escapeHtml(r.owner.split(' ').map(w => w[0]).join('').slice(0, 2))}</span>${escapeHtml(r.owner)}</div>` : '<span class="text-muted">Unassigned</span>'}</td>
        <td class="${r.blocker ? 'blocker-text' : 'text-muted'}">${r.blocker ? escapeHtml(r.blocker) : '—'}</td>
        <td class="${r.health === 'breached' ? 'text-error' : ''}">${escapeHtml(r.timeText)}</td>
        <td><span class="sla-pill ${pc}">${pt}</span></td>
        <td><span class="note-preview">${r.note ? `<strong>${escapeHtml(r.note.who)}:</strong> ${escapeHtml(r.note.text)}` : ''}</span></td>
      </tr>`;
    }).join('') || '<tr><td colspan="8" class="text-muted sla-empty">Nothing needs attention with these filters. 🎉</td></tr>';
    $('naCount').textContent = `${rows.length} of ${all.length} items · breached first, then by share of the stage used · Orders and services use stage targets; Support uses first response, then resolution; Subscriptions flag renewals due in ${SUB_RENEW_WARN_DAYS} days, lapsed terms and seat orders`;
  }

  document.addEventListener('click', e => {
    const k = e.target.closest('[data-kind]');
    if (k) { f.kind = k.dataset.kind; save(); return render(); }
    const h = e.target.closest('[data-health]');
    if (h) { f.health = f.health === h.dataset.health ? 'all' : h.dataset.health; save(); return render(); }
    if (e.target.id === 'naReset') { f = def(); save(); return render(); }
    const r = e.target.closest('#naRows tr[data-href]');
    if (r && r.dataset.href) location.href = r.dataset.href;
  });
  document.addEventListener('keydown', e => { const r = e.target.closest?.('#naRows tr[data-href]'); if (r && e.key === 'Enter' && r.dataset.href) location.href = r.dataset.href; });
  document.addEventListener('change', e => {
    const map = { naClient: 'client', naCc: 'cc', naOwner: 'owner' };
    if (map[e.target.id]) { f[map[e.target.id]] = e.target.value; save(); render(); }
  });
  render();
})();
