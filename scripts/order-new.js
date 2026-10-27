// New order: client → billing entity and country, recipient (People or free text), route, vendor, items priced from
// the client's contract, extra fees, shipping and tax, live summary with margin and procurement-cap check.
// Load a template (?template=) or save the form as one. Creates the order at Submitted to vendor.
// Needs orders-ui.js, stock-data.js and people-data.js.

(function initOrderNew() {
  const root = document.getElementById('newRoot');
  const params = new URLSearchParams(location.search);
  const clients = WH_CLIENTS.filter(c => CONTRACTS[c.id] && activeVersion(CONTRACTS[c.id]));
  const models = Object.keys(ORDER_PRICE_BOOK);

  const d = {
    client: clients.some(c => c.id === params.get('client')) ? params.get('client') : 'acme', cc: '', entity: '', type: 'regular', priority: 'Normal', route: 'hub', vendor: '',
    recipient: '', person: '', address: '', owner: orderUser().split(' ')[0], ticket: '', po: '', costCentre: '',
    approvalRequired: false, lines: [{ model: 'mbp14', qty: 1 }], fees: [], shippingCost: null, shippingRev: null, errors: {}
  };

  function applyClient(keepLines = true) {
    const ccs = Object.keys(HUB_ASSIGNMENTS[d.client] || {});
    if (!ccs.includes(d.cc)) d.cc = ccs[0];
    const t = CONTRACTS[d.client].terms;
    if (!t.entities.some(e => e.id === d.entity)) d.entity = payingEntity(t, d.cc).entity.id;
    if (HUB_ASSIGNMENTS[d.client][d.cc] === 'none' && d.route === 'hub') d.route = 'site';
    const vs = supplyVendorsIn(d.cc);
    if (!vs.some(v => v.key === d.vendor)) d.vendor = vs.length ? [...vs].sort((a, b) => a.range[1] - b.range[1])[0].key : 'ingram';
    if (!keepLines) d.lines = [{ model: 'mbp14', qty: 1 }];
    d.shippingCost = null;
    d.shippingRev = null;
  }

  const tpl = ORDER_TEMPLATES.find(t => t.id === params.get('template'));
  if (tpl) {
    Object.assign(d, { type: tpl.type, priority: tpl.priority, lines: tpl.lines.map(([model, qty]) => ({ model, qty })) });
    d.fees = tpl.fees.map(type => ({ type }));
  }
  applyClient();

  const cur = () => entityById(CONTRACTS[d.client].terms, d.entity).currency;

  // Build a draft order object so the engine's pricing and tax rules apply exactly
  function draftOrder() {
    const c = cur();
    const o = { id: 'NEW', client: d.client, entity: d.entity, cc: d.cc, type: d.type, route: d.route, currency: c, products: [], fees: [] };
    o.products = d.lines.filter(l => l.model && l.qty > 0).map(l => {
      const p = orderModelPrice(d.client, l.model, c);
      return { model: l.model, cat: ORDER_CATEGORY_LABEL[STOCK_MODELS_LITE[l.model].category], name: orderModelName(l.model), qty: l.qty, unitCost: l.unitCost ?? p.cost, unitRev: l.unitRev ?? p.rev, basis: p.basis, delivered: false };
    });
    const ship = orderShipping(d.route, d.type, c);
    o.shippingCost = d.shippingCost ?? ship.cost;
    o.shippingRev = d.shippingRev ?? ship.rev;
    o.fees = d.fees.map(f => ({ ...orderFee(f.type, o, f.qty), ...(f.unitCost != null ? { unitCost: f.unitCost } : {}), ...(f.unitRev != null ? { unitRev: f.unitRev } : {}) }));
    return o;
  }

  // Cap remaining after this order, converting device spend into the cap currency
  function capCheck(o, p) {
    if (typeof capInfo !== 'function' || !CAP_SPEND[d.client] || !capInfo(d.client).limit) return null;
    const ci = capInfo(d.client);
    const add = Math.round(fxConvert(p.subRev, o.currency, ci.cur));
    const after = ci.limit - ci.spent - add;
    const pct = ((ci.spent + add) / ci.limit) * 100;
    return { ci, add, after, pct, over: after < 0, near: pct >= 80 };
  }

  const opt = (v, l, curv) => `<option value="${escapeHtml(v)}"${v === curv ? ' selected' : ''}>${escapeHtml(l)}</option>`;
  const err = k => (d.errors[k] ? `<div class="form-error">${escapeHtml(d.errors[k])}</div>` : '');

  function render() {
    const t = CONTRACTS[d.client].terms;
    const k = CONTRACTS[d.client];
    const o = draftOrder();
    const p = orderPricing(o);
    const c = o.currency;
    const people = PEOPLE.filter(x => x.client === d.client && x.cc === d.cc && x.state !== 'left');
    const vendors = supplyVendorsIn(d.cc);
    const cap = capCheck(o, p);
    const sla = SLA_DEFAULTS[d.type][d.cc];
    const ov = SLA_OVERRIDES[slaKey(d.client, d.type, d.cc)];
    const total = slaType(d.type).milestones.reduce((n, m, i) => n + (m.hubOnly && d.route !== 'hub' ? 0 : (ov && ov[i] != null ? ov[i] : sla[i])), 0);
    const expected = bizAdd(d.cc, ORDER_NOW, total * 60);
    const vendor = vendors.find(v => v.key === d.vendor);

    root.innerHTML = `<div class="order-new-layout">
      <div>
        ${tpl ? `<div class="version-banner version-draft">Prefilled from template <strong>${escapeHtml(tpl.name)}</strong>. Prices are from ${escapeHtml(orderClient(d.client).name)}'s contract.</div>` : ''}
        ${k.status === 'expired' ? `<div class="cap-warning">⚠ ${escapeHtml(orderClient(d.client).name)}'s contract expired ${billingDateSafe(k.end)}. The charge will be flagged for review in Billing.</div>` : ''}
        <section class="card mb-lg"><div class="card-header"><h3 class="card-title">Client</h3></div><div class="card-body"><div class="order-form-grid">
          <div class="form-group"><label class="form-label" for="nClient">Client <span class="req">*</span></label><select class="form-select" id="nClient">${clients.map(x => opt(x.id, x.name, d.client)).join('')}</select></div>
          <div class="form-group"><label class="form-label" for="nCountry">Country <span class="req">*</span></label><select class="form-select" id="nCountry">${Object.keys(HUB_ASSIGNMENTS[d.client]).map(x => opt(x, `${WH_COUNTRIES[x][0]} ${WH_COUNTRIES[x][1]}`, d.cc)).join('')}</select></div>
          <div class="form-group"><label class="form-label" for="nEntity">Billing entity</label><select class="form-select" id="nEntity">${t.entities.map(e => opt(e.id, `${e.name} · ${e.currency}`, d.entity)).join('')}</select><div class="readonly-note">${escapeHtml(payingEntity(t, d.cc).why)} by default. The order is priced in ${c}.</div></div>
          <div class="form-group"><label class="form-label" for="nType">Order type</label><select class="form-select" id="nType">${ORDER_TYPES.map(x => opt(x, slaType(x).name, d.type)).join('')}</select><div class="readonly-note">${escapeHtml(slaType(d.type).note)}</div></div>
          <div class="form-group"><label class="form-label" for="nPriority">Priority</label><select class="form-select" id="nPriority">${ORDER_PRIORITIES.map(x => opt(x, x, d.priority)).join('')}</select></div>
          <div class="form-group"><label class="form-label" for="nOwner">Owner</label><select class="form-select" id="nOwner">${[...new Set([d.owner, ...ORDER_OWNERS])].map(x => opt(x, x, d.owner)).join('')}</select></div>
        </div></div></section>

        <section class="card mb-lg"><div class="card-header"><h3 class="card-title">Recipient and delivery</h3></div><div class="card-body"><div class="order-form-grid">
          <div class="form-group"><label class="form-label" for="nPerson">From People</label><select class="form-select" id="nPerson">${opt('', people.length ? 'Choose an employee…' : 'No employees in this country', d.person)}${people.map(x => opt(x.id, `${x.name} · ${x.role}${x.state === 'joining' ? ` · starts ${peopleFmt(x.start, false)}` : ''}`, d.person)).join('')}</select></div>
          <div class="form-group"><label class="form-label" for="nRecipient">Recipient <span class="req">*</span></label><input class="form-input" id="nRecipient" value="${escapeHtml(d.recipient)}" placeholder="Name, or a site such as Singapore Hub (restock)">${err('recipient')}</div>
          <div class="form-group"><label class="form-label" for="nRoute">Route</label><select class="form-select" id="nRoute">${Object.entries(SLA_ROUTES).map(([x, r]) => `<option value="${x}"${x === d.route ? ' selected' : ''}${x === 'hub' && HUB_ASSIGNMENTS[d.client][d.cc] === 'none' ? ' disabled' : ''}>${r.label}${x === 'hub' ? (HUB_ASSIGNMENTS[d.client][d.cc] === 'none' ? ' (no hub assigned)' : ` · ${escapeHtml(WAREHOUSES.find(w => w.id === HUB_ASSIGNMENTS[d.client][d.cc]).name)}`) : ''}</option>`).join('')}</select><div class="readonly-note">Via a hub adds Received at hub and QC &amp; dispatch.</div></div>
          <div class="form-group"><label class="form-label" for="nAddress">Delivery address</label><input class="form-input" id="nAddress" value="${escapeHtml(d.address)}" placeholder="${d.route === 'hub' ? 'Hub address is used' : 'Street, city, postcode'}" ${d.route === 'hub' ? 'disabled' : ''}>${err('address')}</div>
          <div class="form-group"><label class="form-label" for="nTicket">Ticket</label><input class="form-input" id="nTicket" value="${escapeHtml(d.ticket)}" placeholder="e.g. ZD-1234"></div>
          <div class="form-group"><label class="form-label" for="nCostCentre">Cost centre</label><input class="form-input" id="nCostCentre" value="${escapeHtml(d.costCentre)}"></div>
        </div></div></section>

        <section class="card mb-lg"><div class="card-header"><h3 class="card-title">Items</h3><span class="text-muted">${c} · contract prices</span></div><div class="card-body">
          <div class="order-form-grid" style="margin-bottom: var(--space-md);">
            <div class="form-group"><label class="form-label" for="nVendor">Vendor</label><select class="form-select" id="nVendor">${vendors.map(v => opt(v.key, `${v.name} · lead time ${supplyRangeLabel(v.range)}`, d.vendor)).join('') || opt('ingram', 'Ingram Micro', d.vendor)}</select></div>
            <div class="form-group"><label class="form-label" for="nPo">Vendor PO</label><input class="form-input" id="nPo" value="${escapeHtml(d.po)}" placeholder="Added when submitted, optional"></div>
          </div>
          <table class="table order-lines"><thead><tr><th>Item</th><th>Qty</th><th class="num">Unit cost</th><th class="num">Unit revenue</th><th class="num">Revenue</th><th class="num">Margin</th><th></th></tr></thead><tbody>
            ${o.products.map((l, i) => `<tr>
              <td><select class="form-select" data-line="${i}" data-k="model">${models.map(m => opt(m, orderModelName(m), l.model)).join('')}</select><div class="stock-sub">${escapeHtml(l.basis)}</div></td>
              <td><input type="number" min="1" class="form-input qty-input" data-line="${i}" data-k="qty" value="${l.qty}" aria-label="Quantity"></td>
              <td class="num"><input type="number" min="0" step="0.01" class="form-input money-input" data-line="${i}" data-k="unitCost" value="${l.unitCost}" aria-label="Unit cost"></td>
              <td class="num"><input type="number" min="0" step="0.01" class="form-input money-input" data-line="${i}" data-k="unitRev" value="${l.unitRev}" aria-label="Unit revenue"></td>
              <td class="num">${fmtAmount(c, l.qty * l.unitRev)}</td>
              <td class="num">${marginBadge(marginPct(l.unitCost, l.unitRev))}</td>
              <td>${o.products.length > 1 ? `<button type="button" class="btn-text" data-del-line="${i}">Remove</button>` : ''}</td></tr>`).join('')}
            ${o.fees.map((f, i) => `<tr>
              <td><select class="form-select" data-fee="${i}" data-k="type">${ORDER_FEE_TYPES.map(x => opt(x, x, f.type)).join('')}</select></td>
              <td><input type="number" min="1" class="form-input qty-input" data-fee="${i}" data-k="qty" value="${f.qty}" aria-label="Quantity"></td>
              <td class="num"><input type="number" min="0" step="0.01" class="form-input money-input" data-fee="${i}" data-k="unitCost" value="${f.unitCost}" aria-label="Unit cost"></td>
              <td class="num"><input type="number" min="0" step="0.01" class="form-input money-input" data-fee="${i}" data-k="unitRev" value="${f.unitRev}" aria-label="Unit revenue"></td>
              <td class="num">${fmtAmount(c, f.qty * f.unitRev)}</td><td class="num">${marginBadge(marginPct(f.unitCost, f.unitRev))}</td>
              <td><button type="button" class="btn-text" data-del-fee="${i}">Remove</button></td></tr>`).join('')}
            <tr><td>Shipping · ${SLA_ROUTES[d.route].short}</td><td></td>
              <td class="num"><input type="number" min="0" step="0.01" class="form-input money-input" id="nShipCost" value="${o.shippingCost}" aria-label="Shipping cost"></td>
              <td class="num"><input type="number" min="0" step="0.01" class="form-input money-input" id="nShipRev" value="${o.shippingRev}" aria-label="Shipping revenue"></td>
              <td class="num">${fmtAmount(c, o.shippingRev)}</td><td class="num">${marginBadge(marginPct(o.shippingCost, o.shippingRev))}</td><td></td></tr>
          </tbody></table>
          ${err('lines')}
          <div class="order-form-actions"><button type="button" class="btn btn-secondary btn-sm" data-add-line>+ Add item</button><button type="button" class="btn btn-secondary btn-sm" data-add-fee>+ Add extra fee</button><button type="button" class="btn-text" data-load-tpl>Load template…</button></div>
        </div></section>
      </div>

      <aside class="order-new-summary">
        <section class="card mb-lg"><div class="card-header"><h3 class="card-title">Summary</h3></div><div class="card-body">
          <ul class="summary-lines">
            <li><span>Items (${orderUnits(o)})</span><span>${fmtAmount(c, p.products.reduce((n, l) => n + l.rev, 0))}</span></li>
            ${p.fees.length ? `<li><span>Extra fees</span><span>${fmtAmount(c, p.fees.reduce((n, l) => n + l.rev, 0))}</span></li>` : ''}
            <li><span>Shipping</span><span>${fmtAmount(c, p.ship.rev)}</span></li>
            <li><span>${escapeHtml(p.tax.label)}${p.tax.rate ? ` ${p.tax.rate}%` : ''}</span><span>${fmtAmount(c, p.taxAmt)}</span></li>
            <li class="sum-total"><span>Total</span><span>${fmtAmount(c, p.totalRev)}</span></li>
            <li><span class="text-muted">Cost</span><span class="text-muted">${fmtAmount(c, p.totalCost)}</span></li>
            <li><span class="text-muted">Margin</span><span>${fmtAmount(c, p.margin)} ${marginBadge(p.pct)}</span></li>
          </ul>
          ${cap ? `<div class="${cap.over || cap.near ? 'cap-warning' : 'readonly-note'}">${cap.over ? '⚠ Over procurement cap: ' : cap.near ? '⚠ Near procurement cap: ' : 'Procurement cap: '}${fmtAmount(cap.ci.cur, Math.max(0, cap.ci.limit - cap.ci.spent), 0)} left before this order, ${fmtAmount(cap.ci.cur, cap.after, 0)} after (${Math.round(cap.pct)}% used). <a href="/pages/clients/caps.html" class="link-sm">Caps</a></div>` : ''}
          <label class="def-also-item" style="margin-top: var(--space-sm);"><input type="checkbox" id="nApproval" ${d.approvalRequired || (cap && cap.over) ? 'checked' : ''} ${cap && cap.over ? 'disabled' : ''}> Requires client approval${cap && cap.over ? ' (over cap)' : ''}</label>
          <div class="readonly-note">SLA: ${total}h of business time in ${WH_COUNTRIES[d.cc][1]}${ov ? ' (client exception)' : ''}, so delivery by about ${fmtOrderDate(calIso(expected))}${vendor ? `. ${escapeHtml(vendor.name)} quotes ${supplyRangeLabel(vendor.range)} to ${d.route === 'hub' ? 'the hub' : 'site'}` : ''}.</div>
        </div>
        <div class="side-panel-footer" style="flex-direction: column; align-items: stretch;">
          <button type="button" class="btn btn-primary" id="nCreate">Create order</button>
          <button type="button" class="btn btn-secondary" id="nSaveTpl">Save as template</button>
          <a href="/pages/orders/board.html" class="btn-text" style="text-align:center;">Cancel</a>
        </div></section>
      </aside>
    </div>`;
  }

  const billingDateSafe = s => (typeof billingDate === 'function' ? billingDate(s) : s);

  // Inputs update the draft; changes to money fields keep the user's value
  root.addEventListener('change', e => {
    const el = e.target;
    const id = el.id;
    const v = el.value;
    if (id === 'nClient') { d.client = v; d.person = ''; d.recipient = ''; applyClient(); }
    else if (id === 'nCountry') { d.cc = v; d.person = ''; applyClient(); }
    else if (id === 'nEntity') { d.entity = v; d.lines.forEach(l => { delete l.unitCost; delete l.unitRev; }); d.fees.forEach(f => { delete f.unitCost; delete f.unitRev; }); d.shippingCost = null; d.shippingRev = null; }
    else if (id === 'nType') { d.type = v; d.shippingCost = null; d.shippingRev = null; }
    else if (id === 'nPriority') d.priority = v;
    else if (id === 'nOwner') d.owner = v;
    else if (id === 'nRoute') { d.route = v; d.shippingCost = null; d.shippingRev = null; }
    else if (id === 'nVendor') d.vendor = v;
    else if (id === 'nApproval') d.approvalRequired = el.checked;
    else if (id === 'nPerson') {
      d.person = v;
      const pp = personById(v);
      if (pp) { d.recipient = pp.name; d.address = pp.address || ''; if (!pp.address && d.route !== 'hub') d.errors.address = 'No address on file for this person. Add one or route via the hub.'; }
    } else if (id === 'nShipCost') d.shippingCost = +v;
    else if (id === 'nShipRev') d.shippingRev = +v;
    else if (el.dataset.line != null) {
      const l = d.lines[+el.dataset.line];
      if (el.dataset.k === 'model') { l.model = v; delete l.unitCost; delete l.unitRev; } else l[el.dataset.k] = +v;
    } else if (el.dataset.fee != null) {
      const f = d.fees[+el.dataset.fee];
      if (el.dataset.k === 'type') { f.type = v; delete f.unitCost; delete f.unitRev; delete f.qty; } else f[el.dataset.k] = +v;
    } else return;
    // Defer so a change fired by blur doesn't replace the DOM mid-event
    setTimeout(render);
  });
  root.addEventListener('input', e => {
    const map = { nRecipient: 'recipient', nAddress: 'address', nTicket: 'ticket', nPo: 'po', nCostCentre: 'costCentre' };
    if (map[e.target.id]) { d[map[e.target.id]] = e.target.value; if (e.target.id === 'nRecipient') d.person = ''; }
  });
  root.addEventListener('click', async e => {
    if (e.target.closest('[data-add-line]')) { d.lines.push({ model: 'mxm3s', qty: 1 }); render(); return; }
    if (e.target.closest('[data-add-fee]')) { d.fees.push({ type: 'Windows Autopilot' }); render(); return; }
    const dl = e.target.closest('[data-del-line]');
    if (dl) { d.lines.splice(+dl.dataset.delLine, 1); render(); return; }
    const df = e.target.closest('[data-del-fee]');
    if (df) { d.fees.splice(+df.dataset.delFee, 1); render(); return; }
    if (e.target.closest('[data-load-tpl]')) {
      if (!ORDER_TEMPLATES.length) { orderToast('No templates yet.', 'error'); return; }
      const v = await orderDialog({ title: 'Load template', text: 'Replaces the items, type, priority and extra fees.', fields: [{ id: 't', label: 'Template', type: 'select', options: ORDER_TEMPLATES.map(t => t.name), value: ORDER_TEMPLATES[0].name }], confirm: 'Load' });
      if (!v) return;
      const t = ORDER_TEMPLATES.find(x => x.name === v.t);
      Object.assign(d, { type: t.type, priority: t.priority, lines: t.lines.map(([model, qty]) => ({ model, qty })), fees: t.fees.map(type => ({ type })) });
      d.shippingCost = null; d.shippingRev = null;
      render();
      orderToast(`Loaded “${t.name}”.`);
      return;
    }
    if (e.target.id === 'nSaveTpl') {
      const v = await orderDialog({ title: 'Save as template', fields: [{ id: 'n', label: 'Template name', required: true, value: `${orderModelName(d.lines[0].model)} kit` }], confirm: 'Save template' });
      if (!v) return;
      ORDER_TEMPLATES.push({ id: `tpl-${Date.now()}`, name: v.n, type: d.type, priority: d.priority, lines: d.lines.map(l => [l.model, l.qty]), fees: d.fees.map(f => f.type), by: orderUser() });
      saveOrderTemplates();
      orderToast(`Template “${v.n}” saved.`);
      return;
    }
    if (e.target.id === 'nCreate') create();
  });

  function create() {
    d.errors = {};
    if (!d.recipient.trim()) d.errors.recipient = 'Enter who receives the order.';
    if (d.route !== 'hub' && !d.address.trim()) d.errors.address = 'Enter a delivery address, or route via the hub.';
    if (!d.lines.length || d.lines.some(l => !(l.qty >= 1))) d.errors.lines = 'Every item needs a quantity of at least 1.';
    if (Object.keys(d.errors).length) { render(); orderToast('Fix the highlighted fields.', 'error'); root.querySelector('.form-error')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    const draft = draftOrder();
    const p = orderPricing(draft);
    const cap = capCheck(draft, p);
    const id = nextOrderId();
    const now = orderNowIso();
    const o = {
      ...draft, id, priority: d.priority, channel: 'Manual', vendor: d.vendor, recipient: d.recipient.trim(), person: d.person, orderedBy: `${orderUser()} (for ${ORDER_CLIENT_ADMIN[d.client] || clientAdminFor(CONTRACTS[d.client])})`,
      owner: d.owner, ticket: d.ticket.trim(), po: d.po.trim(), costCentre: d.costCentre.trim(), blocker: '', approvalRequired: d.approvalRequired || !!(cap && cap.over),
      approval: d.approvalRequired || (cap && cap.over) ? 'pending' : '', paymentHold: false, address: d.route === 'hub' ? '' : d.address.trim(), notes: {}, audit: [], pauses: [], stages: {}, posted: false, createdAt: now
    };
    const s = orderSla(o);
    o.expected = calIso(s.due);
    o.audit.push({ at: now, who: orderUser(), text: `Order created by Ops for ${orderClient(o.client).name}${tpl ? ` from template “${tpl.name}”` : ''}` });
    if (o.approvalRequired) o.audit.push({ at: now, who: 'System', text: cap && cap.over ? `Approval required: over procurement cap (${fmtAmount(cap.ci.cur, cap.after, 0)} after order)` : 'Approval required before processing' });
    ORDERS.push(o);
    saveOrders();
    location.href = `/pages/orders/order.html?id=${id}&created=1`;
  }

  render();
})();
