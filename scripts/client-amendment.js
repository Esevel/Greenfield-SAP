// Amendment: current vs proposed terms side by side, publish (locks), and the client's acceptance record.
// Needs hub-data.js, billing-data.js and contract-terms.js.

function initAmendment() {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const client = WH_CLIENTS.find(c => c.id === params.get('c')) || WH_CLIENTS[0];
  const k = CONTRACTS[client.id];
  const ver = k.versions.find(v => v.v === Number(params.get('v'))) || pendingVersion(k) || activeVersion(k);
  const clientHref = v => `/pages/clients/detail.html?c=${client.id}&v=${v}`;
  const STATUS = { draft: ['Draft', 'badge-info'], pending: ['Awaiting acceptance', 'badge-warning'], active: ['Accepted · active', 'badge-success'], superseded: ['Accepted · superseded', 'badge-neutral'], withdrawn: ['Withdrawn', 'badge-neutral'] };

  document.title = `v${ver.v} amendment · ${client.name} - Admin Portal`;
  $('amClientCrumb').textContent = client.name;
  const initial = !activeVersion(k) && ver.v === 1;
  $('amClientCrumb').href = clientHref((activeVersion(k) || ver).v);
  $('amCrumb').textContent = initial ? 'Initial contract' : `v${ver.v} amendment`;
  if (initial) document.title = `Initial contract · ${client.name} - Admin Portal`;

  const termsOf = v => (v.status === 'draft' || v.terms ? v.terms : contractTerms(k, v.v));

  function render() {
    const base = compareBase(k, ver);
    const [label, cls] = STATUS[ver.status];
    $('amTitle').textContent = initial ? 'Initial contract v1' : `Amendment v${ver.v}`;
    $('amTags').innerHTML = `<span class="badge ${cls}">${label}</span><span class="text-muted">· ${escapeHtml(client.name)}${base ? ` · compared with v${base.v}` : ' · initial contract'}</span>`;

    const actions = [`<a class="btn btn-secondary" href="${clientHref(ver.v)}">${ver.status === 'draft' ? 'Edit draft' : 'View full terms'}</a>`];
    if (ver.status === 'pending') {
      actions.push('<button class="btn btn-secondary" id="amWithdraw">Withdraw</button>');
      // A new company's owner registers first (company details and password), then accepts the subscription
      if (initial && !k.registeredAt) actions.push('<button class="btn btn-secondary" id="amResend">Resend link</button><button class="btn btn-primary" id="amRegister" title="Prototype only: simulates the owner completing registration">Simulate owner registration</button>');
      else actions.push('<button class="btn btn-primary" id="amAccept" title="Prototype only: simulates the client admin accepting in their portal">Simulate client acceptance</button>');
    }
    $('amActions').innerHTML = actions.join('');

    // Compare
    const a = base ? contractTerms(k, base.v) : null;
    const b = termsOf(ver);
    $('amColA').textContent = base ? `v${base.v} (${base.status === 'active' ? 'current' : 'previous'})` : '—';
    $('amColB').textContent = `v${ver.v} (${ver.status === 'draft' || ver.status === 'pending' ? 'proposed' : 'new'})`;
    let diffs = a ? contractDiff(a, b) : [];
    // Older seed versions recorded changes as text only (e.g. countries added)
    const recorded = a && !diffs.length ? (ver.changes || []).filter(ch => !ch.path) : [];
    if (recorded.length) {
      $('amColA').textContent = base ? `v${base.v}` : '—';
      $('amColB').textContent = `v${ver.v}`;
      $('amRows').innerHTML = recorded.map(ch => `<tr class="compare-changed"><td>${escapeHtml(ch.field)} <span class="changed-tag">Changed</span></td><td class="compare-was">${escapeHtml(ch.from)}</td><td>${escapeHtml(ch.to)}</td></tr>`).join('');
      $('amCompareTitle').textContent = `${recorded.length} recorded change${recorded.length === 1 ? '' : 's'}`;
      diffs = recorded;
    }
    if (recorded.length) return renderSide(diffs);
    const changedPaths = new Set(diffs.map(d => d.rowPath || d.path));
    const rows = contractRows(b);
    const aRows = a ? contractRows(a) : [];
    const shown = $('amOnlyChanged').checked && a ? rows.filter(r => changedPaths.has(r.path)) : rows;
    let lastSection = '';
    $('amRows').innerHTML = shown.map(r => {
      const was = aRows.find(x => x.path === r.path);
      const ch = changedPaths.has(r.path);
      const head = r.section !== lastSection ? `<tr class="compare-section"><td colspan="3">${CONTRACT_SECTIONS[r.section]}</td></tr>` : '';
      lastSection = r.section;
      return `${head}<tr class="${ch ? 'compare-changed' : ''}">
          <td>${escapeHtml(r.label)}${ch ? ' <span class="changed-tag">Changed</span>' : ''}</td>
          <td class="${ch ? 'compare-was' : ''}">${escapeHtml(was ? was.text : '—')}</td>
          <td>${escapeHtml(r.text)}</td>
        </tr>`;
    }).join('') || `<tr><td colspan="3" class="text-muted sla-empty">${a ? 'No changes from the current version yet. Edit the draft to change terms.' : 'Initial contract: no earlier version to compare with.'}</td></tr>`;
    $('amCompareTitle').textContent = a ? `${diffs.length} change${diffs.length === 1 ? '' : 's'}` : 'Terms';
    renderSide(diffs);
  }

  function renderSide(diffs) {
    // Publish card (drafts only)
    $('amPublishCard').hidden = ver.status !== 'draft';
    $('amOnlyChanged').closest('label').style.display = initial ? 'none' : '';
    $('amPublish').textContent = initial ? 'Send registration link' : 'Publish';
    $('amPublishCard').querySelector('.card-title').textContent = initial ? 'Send to company owner' : 'Publish to client';
    $('amPublish').disabled = !initial && !diffs.length;
    if (ver.status === 'draft' && typeof subValidate === 'function') {
      const errs = subValidate(activeVersion(k) ? contractTerms(k, activeVersion(k).v) : null, { ...ver.terms, tier: ver.terms.tier || k.tier }, $('amEffective').value);
      $('amError').textContent = errs.join(' ');
      $('amError').hidden = !errs.length;
    }
    if (initial && ver.status === 'draft') {
      $('amEffective').value = $('amEffective').value || k.start;
      $('amNote').value = $('amNote').value || 'Initial contract';
    }

    // Details
    const rowsInfo = [
      ['Effective date', ver.effective ? billingDate(ver.effective) : 'Set when published'],
      ['Note', ver.note || '—'],
      ['Created by', ver.createdBy || ver.publishedBy || 'Esevel'],
      ['Published', ver.publishedAt ? `${ver.publishedAt}${ver.publishedBy ? ` by ${ver.publishedBy}` : ''}` : ver.status === 'draft' ? 'Not yet' : '—']
    ];
    $('amDetailsCard').innerHTML = `<div class="card-header"><h3 class="card-title">Amendment</h3></div>
      <div class="card-body"><div class="info-grid">${rowsInfo.map(([l, v]) => `<div class="info-row am-info"><span class="info-label">${l}</span><span class="info-value">${escapeHtml(v)}</span></div>`).join('')}</div></div>`;

    // Acceptance
    let accept;
    if (ver.acceptedBy) {
      accept = `<div class="accept-ok">✓ Accepted</div>
        <div class="info-grid">
          <div class="info-row am-info"><span class="info-label">Accepted by</span><span class="info-value">${escapeHtml(ver.acceptedBy)} · client admin</span></div>
          <div class="info-row am-info"><span class="info-label">When</span><span class="info-value">${escapeHtml(ver.acceptedAt)}</span></div>
          <div class="info-row am-info"><span class="info-label">IP address</span><span class="info-value">${escapeHtml(ver.ip)}</span></div>
          <div class="info-row am-info"><span class="info-label">Version accepted</span><span class="info-value">v${ver.v}</span></div>
        </div>`;
    } else if (ver.status === 'pending' && initial) {
      const step = (done, label, sub) => `<li class="reg-step ${done ? 'reg-done' : ''}"><span class="reg-dot">${done ? '✓' : ''}</span><div><strong>${label}</strong><div class="stock-sub">${sub}</div></div></li>`;
      accept = `<ol class="reg-steps">
          ${step(true, 'Registration link sent', `${escapeHtml(k.adminEmail || clientAdminFor(k))} · ${escapeHtml(k.linkSentAt || ver.publishedAt || '')}`)}
          ${step(!!k.registeredAt, 'Owner registered', k.registeredAt ? `${escapeHtml(clientAdminFor(k))} completed company registration and set a password · ${escapeHtml(k.registeredAt)}` : 'Waiting for the owner to open the link, complete company details and set a password')}
          ${step(false, 'Subscription accepted', k.registeredAt ? `Waiting for ${escapeHtml(clientAdminFor(k))} to accept in the company portal` : 'After registration')}
        </ol>
        <div class="readonly-note">Terms stay locked; nothing is billed and orders can't be raised until the owner accepts. Withdraw to change terms.</div>`;
    } else if (ver.status === 'pending') {
      accept = `<div class="accept-wait">Waiting for ${escapeHtml(clientAdminFor(k))}</div><div class="readonly-note">Sent to the client admin in their portal. Terms stay locked; ${initial ? 'nothing is billed and orders can\'t be raised until the client accepts' : `the active contract (v${activeVersion(k).v}) keeps applying until acceptance`}.</div>`;
    } else if (ver.status === 'withdrawn') {
      accept = '<div class="text-muted">Withdrawn before acceptance.</div>';
    } else {
      accept = '<div class="text-muted">Not sent yet. The client admin accepts after you publish.</div>';
    }
    $('amAcceptCard').innerHTML = `<div class="card-header"><h3 class="card-title">${initial && !ver.acceptedBy ? 'Registration and acceptance' : 'Client acceptance'}</h3></div><div class="card-body">${accept}</div>`;
  }

  function note(text) {
    $('amSaved').textContent = `✓ ${text}`;
    $('amSaved').hidden = false;
  }

  $('amOnlyChanged').addEventListener('change', render);
  $('amEffective').addEventListener('change', render);
  $('amEffective').min = '2026-10-17';

  $('amPublish').addEventListener('click', () => {
    const eff = $('amEffective').value;
    const txt = $('amNote').value.trim();
    // Seats are committed for the subscription term: check the draft before it can be sent
    const prevTerms = activeVersion(k) ? contractTerms(k, activeVersion(k).v) : null;
    const subErr = typeof subValidate === 'function' ? subValidate(prevTerms, { ...ver.terms, tier: ver.terms.tier || k.tier }, eff) : [];
    const msg = !eff ? 'Pick an effective date.' : !txt ? 'Add a note explaining the change for the client.' : subErr.length ? subErr.join(' ') : '';
    $('amError').textContent = msg;
    $('amError').hidden = !msg;
    if (msg) return;
    if (initial) {
      // The first contract keeps its full terms; there is nothing earlier to diff against
      Object.assign(ver, { status: 'pending', effective: eff, note: txt, changes: [], publishedBy: 'You', publishedAt: '2026-10-16 16:40 SGT' });
      k.start = eff;
      k.linkSentAt = '2026-10-16 16:40 SGT';
      delete k.registeredAt;
      saveContracts();
      note(`Registration link sent to ${clientAdminFor(k)}${k.adminEmail ? ` (${k.adminEmail})` : ''}. ${client.name} becomes active once they register and accept.`);
      return render();
    }
    const changes = contractDiff(contractTerms(k, activeVersion(k).v), ver.terms);
    Object.assign(ver, { status: 'pending', effective: eff, note: txt, changes, publishedBy: 'You', publishedAt: '2026-10-16 16:40 SGT' });
    delete ver.terms;
    k.status = 'amendment';
    saveContracts();
    note(`Published. Terms are locked until ${client.name}'s admin accepts.`);
    render();
  });

  $('amActions').addEventListener('click', e => {
    if (e.target.id === 'amWithdraw' && initial) {
      // Withdrawing the first contract sends it back to draft so terms can be changed and re-sent
      Object.assign(ver, { status: 'draft', publishedAt: '', publishedBy: '' });
      delete k.registeredAt;
      delete k.linkSentAt;
      saveContracts();
      note('Initial contract withdrawn and back in draft. Edit the terms, then send it again.');
      render();
    } else if (e.target.id === 'amRegister' && initial) {
      k.registeredAt = '2026-10-16 17:05 SGT';
      saveContracts();
      note(`${clientAdminFor(k)} registered ${client.name} and set a password. Next: they accept the subscription in the company portal.`);
      render();
    } else if (e.target.id === 'amResend' && initial) {
      k.linkSentAt = '2026-10-16 17:10 SGT';
      saveContracts();
      note(`Registration link sent again to ${k.adminEmail || clientAdminFor(k)}.`);
      render();
    } else if (e.target.id === 'amAccept' && initial) {
      const t = cloneTerms(ver.terms);
      k.tier = t.tier || k.tier;
      k.end = t.end || k.end;
      delete t.tier;
      delete t.end;
      k.terms = t;
      delete ver.terms;
      Object.assign(ver, { status: 'active', acceptedBy: clientAdminFor(k), acceptedAt: '2026-10-16 16:52 SGT', ip: '203.0.113.24' });
      k.status = 'active';
      saveContracts();
      note(`Accepted by ${ver.acceptedBy}. ${client.name} is now an active client from ${billingDate(ver.effective)}.`);
      render();
    } else if (e.target.id === 'amWithdraw') {
      ver.status = 'withdrawn';
      k.status = 'active';
      saveContracts();
      note(`v${ver.v} withdrawn. The client can no longer accept it.`);
      render();
    } else if (e.target.id === 'amAccept') {
      // Acceptance makes this version active: its changes are applied to the live terms
      const prev = activeVersion(k);
      ver.changes.filter(ch => ch.path).forEach(ch => {
        if (ch.path === 'tier' || ch.path === 'end') k[ch.path] = ch.toVal;
        else setPath(k.terms, ch.path, ch.toVal);
      });
      prev.status = 'superseded';
      Object.assign(ver, { status: 'active', acceptedBy: clientAdminFor(k), acceptedAt: '2026-10-16 16:52 SGT', ip: '203.0.113.24' });
      k.status = 'active';
      saveContracts();
      note(`Accepted by ${ver.acceptedBy}. v${ver.v} is now the active contract from ${billingDate(ver.effective)}.`);
      render();
    }
  });

  render();
  if (params.get('created')) note(`${client.name} created as a pending subscription. Registration link sent to ${clientAdminFor(k)}${k.adminEmail ? ` (${k.adminEmail})` : ''}.`);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAmendment);
else initAmendment();
