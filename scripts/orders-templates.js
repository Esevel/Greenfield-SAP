// Orders · Templates: saved kits that prefill a new order (items, type, priority, extra fees). Use, rename, duplicate
// or delete; usage counts come from orders created from each template. Needs orders-ui.js.

(function initOrderTemplates() {
  const $ = id => document.getElementById(id);
  renderOrderHeader('templates');

  const uses = t => ORDERS.filter(o => o.audit.some(a => a.text.includes(`from template “${t.name}”`))).length;
  const units = t => t.lines.reduce((n, [, q]) => n + q, 0);

  function render() {
    const q = $('tpQ').value.trim().toLowerCase();
    const list = ORDER_TEMPLATES.filter(t => !q || `${t.name} ${orderTemplateSummary(t)}`.toLowerCase().includes(q));
    $('tpRows').innerHTML = list.map(t => `<tr data-id="${t.id}">
        <td><strong>${escapeHtml(t.name)}</strong><div class="stock-sub">by ${escapeHtml(t.by)}</div></td>
        <td>${escapeHtml(orderTemplateSummary(t))}${t.fees.length ? `<div class="stock-sub">+ ${t.fees.map(escapeHtml).join(', ')}</div>` : ''}</td>
        <td class="num">${units(t)}</td>
        <td>${slaType(t.type).name}${t.priority !== 'Normal' ? ` · ${t.priority}` : ''}</td>
        <td class="num">${uses(t)}</td>
        <td class="tpl-actions">
          <a href="/pages/orders/new.html?template=${t.id}" class="btn btn-primary btn-sm">Use</a>
          ${orderMenuHtml('⋯', [[`data-tpl-rename="${t.id}"`, 'Rename…'], [`data-tpl-dup="${t.id}"`, 'Duplicate'], [`data-tpl-del="${t.id}"`, 'Delete', 'order-menu-danger']])}
        </td>
      </tr>`).join('') || `<tr><td colspan="6" class="text-muted sla-empty">${ORDER_TEMPLATES.length ? 'No templates match.' : 'No templates yet. Save one from the New order form or an order page.'}</td></tr>`;
    $('tpCount').textContent = `${list.length} of ${ORDER_TEMPLATES.length} templates · prices come from the client's contract when a template is used`;
  }

  $('tpQ').addEventListener('input', render);
  $('tpRows').addEventListener('click', async e => {
    const b = e.target.closest('[data-tpl-rename],[data-tpl-dup],[data-tpl-del]');
    if (!b) return;
    const t = ORDER_TEMPLATES.find(x => x.id === (b.dataset.tplRename || b.dataset.tplDup || b.dataset.tplDel));
    if (b.dataset.tplRename) {
      const v = await orderDialog({ title: 'Rename template', fields: [{ id: 'n', label: 'Name', value: t.name, required: true }], confirm: 'Save' });
      if (!v) return;
      t.name = v.n;
      orderToast('Template renamed.');
    } else if (b.dataset.tplDup) {
      ORDER_TEMPLATES.push({ ...JSON.parse(JSON.stringify(t)), id: `tpl-${Date.now()}`, name: `${t.name} (copy)`, by: orderUser() });
      orderToast(`Duplicated “${t.name}”.`);
    } else {
      const v = await orderDialog({ title: `Delete “${t.name}”?`, text: 'Orders already created from it are not affected.', confirm: 'Delete', danger: true });
      if (!v) return;
      ORDER_TEMPLATES.splice(ORDER_TEMPLATES.indexOf(t), 1);
      orderToast(`Template “${t.name}” deleted.`);
    }
    saveOrderTemplates();
    render();
    renderOrderHeader('templates');
  });

  render();
})();
