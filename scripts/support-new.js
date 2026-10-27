// New ticket: client, country, requester (picked from People or typed), subject, description, priority, category,
// source and optional owner. Shows the SLA targets that will apply. Needs support-ui.js; people-data.js optional.

(function initSupportNew() {
  const root = document.getElementById('ntRoot');
  const clients = WH_CLIENTS.filter(c => typeof CONTRACTS === 'undefined' || !CONTRACTS[c.id] || CONTRACTS[c.id].status !== 'onboarding');
  const params = new URLSearchParams(location.search);
  const d = { client: params.get('client') || clients[0].id, cc: '', person: '', requester: '', email: '', subject: '', description: '', priority: 'Normal', category: 'Hardware', source: 'Phone', ref: '', owner: '', errors: {} };
  const people = () => (typeof PEOPLE !== 'undefined' ? PEOPLE.filter(p => p.client === d.client && p.state !== 'left') : []);
  const countries = () => Object.keys(HUB_ASSIGNMENTS[d.client] || {}).filter(cc => SLA_DEFAULTS.support[cc]);
  const fix = () => { if (!countries().includes(d.cc)) d.cc = countries()[0] || 'SG'; };
  fix();

  const opt = (v, l, cur) => `<option value="${escapeHtml(v)}"${v === cur ? ' selected' : ''}>${escapeHtml(l)}</option>`;
  const err = k => (d.errors[k] ? `<div class="form-error">${escapeHtml(d.errors[k])}</div>` : '');

  function render() {
    const tg = supportTargets({ client: d.client, cc: d.cc, priority: d.priority });
    root.innerHTML = `<div class="order-new-layout">
      <form class="card" id="ntForm" novalidate><div class="card-body">
        <div class="order-form-grid">
          <div class="form-group"><label class="form-label" for="ntClient">Client <span class="req">*</span></label><select class="form-select" id="ntClient" data-k="client">${clients.map(c => opt(c.id, c.name, d.client)).join('')}</select></div>
          <div class="form-group"><label class="form-label" for="ntCc">Country</label><select class="form-select" id="ntCc" data-k="cc">${countries().map(cc => opt(cc, `${WH_COUNTRIES[cc][0]} ${WH_COUNTRIES[cc][1]}`, d.cc)).join('')}</select></div>
          <div class="form-group"><label class="form-label" for="ntPerson">From People</label><select class="form-select" id="ntPerson" data-k="person">${opt('', people().length ? 'Choose an employee…' : 'No people records', d.person)}${people().map(p => opt(p.id, `${p.name} · ${p.role}`, d.person)).join('')}</select></div>
          <div class="form-group"><label class="form-label" for="ntRequester">Requester <span class="req">*</span></label><input class="form-input" id="ntRequester" data-k="requester" value="${escapeHtml(d.requester)}" placeholder="Full name">${err('requester')}</div>
          <div class="form-group wide"><label class="form-label" for="ntEmail">Requester email <span class="req">*</span></label><input type="email" class="form-input" id="ntEmail" data-k="email" value="${escapeHtml(d.email)}" placeholder="name@client.com">${err('email')}</div>
          <div class="form-group wide"><label class="form-label" for="ntSubject">Subject <span class="req">*</span></label><input class="form-input" id="ntSubject" data-k="subject" value="${escapeHtml(d.subject)}" placeholder="e.g. Laptop won’t charge">${err('subject')}</div>
          <div class="form-group wide"><label class="form-label" for="ntDesc">Description <span class="req">*</span></label><textarea class="form-textarea" id="ntDesc" data-k="description" rows="4" placeholder="What’s happening, since when, what’s been tried">${escapeHtml(d.description)}</textarea>${err('description')}</div>
          <div class="form-group"><label class="form-label" for="ntPriority">Priority</label><select class="form-select" id="ntPriority" data-k="priority">${SUPPORT_PRIORITIES.map(p => opt(p, p, d.priority)).join('')}</select></div>
          <div class="form-group"><label class="form-label" for="ntCategory">Category</label><select class="form-select" id="ntCategory" data-k="category">${SUPPORT_CATEGORIES.map(c => opt(c, c, d.category)).join('')}</select></div>
          <div class="form-group"><label class="form-label" for="ntSource">Received via</label><select class="form-select" id="ntSource" data-k="source">${SUPPORT_SOURCES.map(s => opt(s, s, d.source)).join('')}</select></div>
          <div class="form-group"><label class="form-label" for="ntRef">External reference</label><input class="form-input" id="ntRef" data-k="ref" value="${escapeHtml(d.ref)}" placeholder="e.g. INC0071"></div>
          <div class="form-group"><label class="form-label" for="ntOwner">Owner</label><select class="form-select" id="ntOwner" data-k="owner">${opt('', 'Unassigned (goes to triage)', d.owner)}${SUPPORT_AGENTS.map(a => opt(a, a, d.owner)).join('')}</select></div>
        </div>
      </div>
      <div class="cn-footer"><a href="/pages/support/board.html" class="btn-text">Cancel</a><button type="submit" class="btn btn-primary">Create ticket</button></div>
      </form>
      <aside class="order-new-summary"><section class="card"><div class="card-header"><h3 class="card-title">SLA for this ticket</h3></div><div class="card-body">
        <ul class="summary-lines">
          <li><span>First response</span><span>${fmtMins(tg.response)}</span></li>
          <li><span>Resolution</span><span>${fmtMins(tg.resolution)}</span></li>
        </ul>
        <div class="readonly-note">${tg.custom ? 'Client exception' : `${WH_COUNTRIES[d.cc][1]} standard`} from SLA configuration${d.priority === 'Urgent' ? ', halved for Urgent' : d.priority === 'Low' ? ', doubled for Low' : ''}. Clocks start when the ticket is created.</div>
      </div></section></aside>
    </div>`;
  }

  root.addEventListener('input', e => { const k = e.target.dataset.k; if (k && e.target.tagName !== 'SELECT') d[k] = e.target.value; });
  root.addEventListener('change', e => {
    const k = e.target.dataset.k;
    if (!k || e.target.tagName !== 'SELECT') return;
    d[k] = e.target.value;
    if (k === 'client') { d.person = ''; fix(); }
    if (k === 'person' && d.person) { const p = PEOPLE.find(x => x.id === d.person); d.requester = p.name; d.email = p.email; if (countries().includes(p.cc)) d.cc = p.cc; }
    setTimeout(render);
  });
  root.addEventListener('submit', e => {
    e.preventDefault();
    d.errors = {};
    if (!d.requester.trim()) d.errors.requester = 'Who is the ticket for?';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email.trim())) d.errors.email = 'Enter a valid email.';
    if (!d.subject.trim()) d.errors.subject = 'Add a short subject.';
    if (!d.description.trim()) d.errors.description = 'Describe the problem.';
    if (Object.keys(d.errors).length) { render(); root.querySelector('.form-error').closest('.form-group').scrollIntoView({ block: 'center' }); return; }
    const t = supportCreate(d);
    location.href = `/pages/support/ticket.html?id=${t.id}&created=1`;
  });
  render();
})();
