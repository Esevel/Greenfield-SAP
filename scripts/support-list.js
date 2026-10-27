// Support · List: sortable-by-risk table with the same tiles and filters as Board. Needs support-ui.js.

(function initSupportList() {
  const $ = id => document.getElementById(id);
  const f = supportFiltersLoad();
  renderSupportHeader('list');
  $('spFilters').innerHTML = supportFilterBarHtml(f);
  supportBindControls($('spTiles'), $('spFilters'), f, render);

  function render() {
    $('spTiles').innerHTML = supportTilesHtml(f);
    const rank = { breached: 0, risk: 1, ok: 2, paused: 3, complete: 4 };
    const rows = SUPPORT_TICKETS.filter(t => supportMatches(t, f)).map(t => ({ t, s: supportSla(t) }))
      .sort((a, b) => rank[a.s.health] - rank[b.s.health] || a.s.live.left - b.s.live.left);
    $('spRows').innerHTML = rows.map(({ t, s }) => {
      const [pc, pt] = SUPPORT_HEALTH_PILL[s.health];
      const last = t.thread[t.thread.length - 1];
      return `<tr data-href="/pages/support/ticket.html?id=${t.id}" tabindex="0">
        <td class="card-id">${t.id}${t.ref ? `<div class="stock-sub">${escapeHtml(t.ref)}</div>` : ''}</td>
        <td><strong>${escapeHtml(t.subject)}</strong><div class="stock-sub">${escapeHtml(t.requester)} · ${escapeHtml(t.category)}</div></td>
        <td>${escapeHtml(supportClient(t).name)}<div class="stock-sub">${supportFlag(t.cc)} ${t.cc}</div></td>
        <td>${supportPriorityTag(t.priority)}</td>
        <td>${SUPPORT_STAGE_LABEL[t.stage]}</td>
        <td><div class="owner-cell">${supportOwnerHtml(t)}</div></td>
        <td><span class="sla-pill ${pc}">${pt}</span><div class="stock-sub">${t.stage === 'resolved' ? `Resolved ${fmtSupportTs(t.resolvedAt)}` : escapeHtml(supportClockText(s.live, s.liveName))}</div></td>
        <td>${fmtSupportTs(last.at)}<div class="stock-sub">${escapeHtml(last.who)}</div></td>
      </tr>`;
    }).join('') || '<tr><td colspan="8" class="text-muted sla-empty">No tickets match these filters.</td></tr>';
    $('spCount').textContent = `${rows.length} ticket${rows.length === 1 ? '' : 's'} · sorted by SLA risk`;
  }

  const go = r => { location.href = r.dataset.href; };
  $('spRows').addEventListener('click', e => { const r = e.target.closest('tr[data-href]'); if (r) go(r); });
  $('spRows').addEventListener('keydown', e => { const r = e.target.closest('tr[data-href]'); if (r && e.key === 'Enter') go(r); });
  render();
})();
