// Catalogue › Default markup: category × tier grid, click a cell to save a new version.
// Needs hub-data.js, billing-data.js, contract-terms.js, billing-settings-data.js and markup-data.js.

function initCatalogueMarkup() {
  const $ = id => document.getElementById(id);
  const tiers = Object.keys(VOLUME_TIERS);
  const effective = r => `${billingDate(r.from)}${r.to ? ` → ${billingDate(r.to)}` : ' → open'}`;
  let editing = null;

  function render() {
    $('mkHead').innerHTML = `<tr><th>Category</th>${tiers.map(t => `<th class="num">${VOLUME_TIERS[t].replace(' · ', '<div class="stock-sub">')}</div></th>`).join('')}</tr>`;
    $('mkRows').innerHTML = DEVICE_CATEGORIES.map(cat => `<tr>
        <td><strong>${cat}</strong></td>
        ${tiers.map(t => {
          const cur = markupCurrent(cat, t);
          const next = markupScheduled(cat, t);
          return `<td class="num"><button type="button" class="mk-cell" data-cat="${cat}" data-tier="${t}" aria-label="Edit ${cat} ${VOLUME_TIERS[t]}">${cur.markup > 0 ? '+' : ''}${cur.markup}%</button>${next ? `<div class="stock-sub sf-next">${next.markup > 0 ? '+' : ''}${next.markup}% from ${billingDate(next.from)}</div>` : ''}</td>`;
        }).join('')}
      </tr>`).join('');
    $('mkCountry').innerHTML = MARKUP_COUNTRY_ADJ.map(a => `<tr>
        <td>${WH_COUNTRIES[a.country][0]} ${WH_COUNTRIES[a.country][1]}</td>
        <td>${a.category}</td>
        <td class="num ${a.adj > 0 ? 'text-error' : 'text-success'}">${a.adj > 0 ? '+' : ''}${a.adj} pts</td>
        <td>${billingDate(a.from)}${a.from > SETTINGS_TODAY ? ' <span class="badge badge-info badge-sm">Scheduled</span>' : ''}</td>
      </tr>`).join('');
    const past = DEFAULT_MARKUP.filter(r => ruleStatus(r) === 'expired');
    $('mkHistoryCard').hidden = !$('mkPast').checked;
    $('mkHistory').innerHTML = past.map(r => `<tr class="row-muted"><td>${r.category}</td><td>${VOLUME_TIERS[r.tier].split(' ·')[0]}</td><td class="num">${r.markup > 0 ? '+' : ''}${r.markup}%</td><td>${effective(r)}</td><td class="text-muted">${escapeHtml(r.by)}</td></tr>`).join('') || '<tr><td colspan="5" class="text-muted sla-empty">No past versions</td></tr>';
    const exceptions = Object.values(CONTRACTS).filter(k => k.terms.pricing.markup.length).length;
    $('mkCount').textContent = `These are suggestions for custom client contracts; standard clients pay retail. Add an adjustment explicitly on the client contract for it to apply. Negative adjustments are allowed, but the client price is floored at vendor cost. ${exceptions} clients currently have contract adjustments.`;
  }

  function open(cat, tier) {
    const cur = markupCurrent(cat, tier);
    editing = cur;
    $('mkTitle').textContent = `${cat} · ${VOLUME_TIERS[tier].split(' ·')[0]}`;
    $('mkMeta').textContent = `${VOLUME_TIERS[tier].split(' · ')[1]} · currently ${cur.markup > 0 ? '+' : ''}${cur.markup}% since ${billingDate(cur.from)}`;
    $('mkValue').value = cur.markup;
    $('mkFrom').value = '';
    $('mkFrom').min = '2026-10-17';
    $('mkError').hidden = true;
    $('mkImpact').textContent = 'Suggested when adding a custom client contract adjustment. Changing this default does not change current client prices; standard clients continue to pay retail.';
    $('mkVersions').innerHTML = DEFAULT_MARKUP.filter(r => r.chain === cur.chain).sort((a, b) => b.from.localeCompare(a.from))
      .map(r => `<li class="${r === cur ? 'current' : ''}"><strong>${r.markup > 0 ? '+' : ''}${r.markup}%</strong> · ${effective(r)}<div class="location-dates">${escapeHtml(r.by)}</div></li>`).join('');
    $('mkPanel').classList.add('open');
    $('mkOverlay').classList.add('show');
  }
  const close = () => { $('mkPanel').classList.remove('open'); $('mkOverlay').classList.remove('show'); editing = null; };

  $('mkSave').addEventListener('click', () => {
    const markup = Number($('mkValue').value);
    const from = $('mkFrom').value;
    const err = $('mkValue').value === '' || markup < -100 || markup > 100 ? 'Enter an adjustment between -100% and +100%.' : markup === editing.markup ? 'Adjustment is unchanged.' : !from ? 'Pick an effective date.' : '';
    $('mkError').textContent = err;
    $('mkError').hidden = !err;
    if (err) return;
    // A new version replaces any already-scheduled one for this cell
    const sched = markupScheduled(editing.category, editing.tier);
    if (sched) DEFAULT_MARKUP.splice(DEFAULT_MARKUP.indexOf(sched), 1);
    addRuleVersion(DEFAULT_MARKUP, editing, { markup, by: 'You' }, from);
    $('mkSaved').textContent = `✓ ${editing.category} ${VOLUME_TIERS[editing.tier].split(' ·')[0]}: ${markup > 0 ? '+' : ''}${markup}% from ${billingDate(from)}. The current ${editing.markup > 0 ? '+' : ''}${editing.markup}% is kept until then.`;
    $('mkSaved').hidden = false;
    close();
    render();
  });

  $('mkRows').addEventListener('click', e => { const b = e.target.closest('.mk-cell'); if (b) open(b.dataset.cat, b.dataset.tier); });
  $('mkPast').addEventListener('change', render);
  $('mkClose').addEventListener('click', close);
  $('mkCancel').addEventListener('click', close);
  $('mkOverlay').addEventListener('click', close);
  render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCatalogueMarkup);
else initCatalogueMarkup();
