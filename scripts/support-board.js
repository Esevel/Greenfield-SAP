// Support · Board: a column per status; cards show both SLA clocks; click opens the ticket. Needs support-ui.js.

(function initSupportBoard() {
  const $ = id => document.getElementById(id);
  const f = supportFiltersLoad();
  renderSupportHeader('board');
  $('spFilters').innerHTML = supportFilterBarHtml(f);
  supportBindControls($('spTiles'), $('spFilters'), f, render);

  function cardHtml(t) {
    const s = supportSla(t);
    const [pc, pt] = SUPPORT_HEALTH_PILL[s.health];
    return `<a class="board-card support-card" href="/pages/support/ticket.html?id=${t.id}">
      <div class="card-top"><span class="card-id">${t.id}</span>${t.ref ? `<span class="ticket-chip">${escapeHtml(t.ref)}</span>` : ''}</div>
      <div class="card-subject">${escapeHtml(t.subject)}</div>
      <div class="card-client">${escapeHtml(supportClient(t).name)}</div>
      <div class="card-recipient">${escapeHtml(t.requester)} · ${supportFlag(t.cc)}</div>
      <div class="card-tags">${supportPriorityTag(t.priority)}<span class="tag-package">${escapeHtml(t.category)}</span><span class="sla-pill ${pc}">${pt}</span></div>
      ${t.stage === 'resolved' ? `<div class="card-client">Resolved ${fmtSupportTs(t.resolvedAt)}</div>` : supportClocksHtml(t, s)}
      <div class="card-bottom"><span class="${t.owner ? '' : 'text-muted'}">${escapeHtml(t.owner || 'Unassigned')}</span>${t.owner ? `<span class="card-avatar">${escapeHtml(t.owner.slice(0, 2))}</span>` : '<span class="card-avatar card-avatar-empty">?</span>'}</div>
    </a>`;
  }

  function render() {
    $('spTiles').innerHTML = supportTilesHtml(f);
    const rank = { breached: 0, risk: 1, ok: 2, paused: 3, complete: 4 };
    const list = SUPPORT_TICKETS.filter(t => supportMatches(t, f)).map(t => ({ t, s: supportSla(t) }))
      .sort((a, b) => rank[a.s.health] - rank[b.s.health] || a.s.live.left - b.s.live.left).map(x => x.t);
    const stages = SUPPORT_STAGES.filter(([k]) => k !== 'resolved' || ['resolved', 'all'].includes(f.status));
    $('spBoard').style.setProperty('--cols', stages.length);
    $('spBoard').innerHTML = stages.map(([k, label]) => {
      const cards = list.filter(t => t.stage === k);
      return `<section class="board-column">
        <div class="board-column-header"><div class="board-column-title">${label} <span class="board-count">${cards.length}</span></div>${k === 'waiting' ? '<span class="board-avg">Resolution paused</span>' : ''}</div>
        <div class="board-cards">${cards.map(cardHtml).join('') || '<div class="board-empty">Nothing here</div>'}</div>
      </section>`;
    }).join('');
  }
  render();
})();
