// Service reports: table and "Generate reports for September"

const REPORT_CLIENTS = [
  { name: 'Acme Tech', logo: 'AT' },
  { name: 'TechGlobal Inc', logo: 'TG' },
  { name: 'Digital Solutions', logo: 'DS' },
  { name: 'MediaWorks', logo: 'MW' },
  { name: 'FinanceExperts', logo: 'FE' },
  { name: 'Northwind Health', logo: 'NH' }
];

const REPORTS = [
  { client: 'Acme Tech', month: '2026-09', status: 'In review', tickets: 142, sla: 96.5, response: '38m', resolution: '6h 10m' },
  { client: 'TechGlobal Inc', month: '2026-09', status: 'Draft', tickets: 211, sla: 91.9, response: '1h 22m', resolution: '14h 05m' },
  { client: 'Digital Solutions', month: '2026-09', status: 'Draft', tickets: 87, sla: 88.5, response: '52m', resolution: '9h 40m' },
  { client: 'Northwind Health', month: '2026-09', status: 'In review', tickets: 64, sla: 98.4, response: '24m', resolution: '3h 15m' },
  { client: 'Acme Tech', month: '2026-08', status: 'Issued', tickets: 131, sla: 97.7, response: '35m', resolution: '5h 50m', issued: '5 Sep 2026', by: 'Qonit' },
  { client: 'TechGlobal Inc', month: '2026-08', status: 'Issued', tickets: 198, sla: 93.4, response: '1h 15m', resolution: '13h 20m', issued: '6 Sep 2026', by: 'Marcus' },
  { client: 'MediaWorks', month: '2026-08', status: 'Issued', tickets: 56, sla: 100, response: '2h 05m', resolution: '18h 30m', issued: '5 Sep 2026', by: 'Aisha' },
  { client: 'FinanceExperts', month: '2026-08', status: 'Issued', tickets: 73, sla: 95.9, response: '41m', resolution: '7h 05m', issued: '8 Sep 2026', by: 'Jia Ling' }
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = m => { const [y, mm] = m.split('-').map(Number); return `${MONTH_NAMES[mm - 1]} ${y}`; };

function initServiceReports() {
  const $ = id => document.getElementById(id);

  function statusBadge(s) {
    const cls = { Draft: 'badge-muted', 'In review': 'badge-warning', Issued: 'badge-success' }[s];
    return `<span class="badge ${cls} badge-sm">${s}</span>`;
  }

  function slaClass(v) {
    if (v >= 95) return 'sla-good';
    if (v >= 90) return 'sla-warn';
    return 'sla-bad';
  }

  function render() {
    const rows = [...REPORTS].sort((a, b) => b.month.localeCompare(a.month) || a.client.localeCompare(b.client));
    $('reportRows').innerHTML = rows.map(r => {
      const logo = REPORT_CLIENTS.find(c => c.name === r.client).logo;
      // Only Acme Tech · September has an editor page in the prototype
      const hasDetail = r.client === 'Acme Tech' && r.month === '2026-09';
      return `<tr class="${r.isNew ? 'row-new' : ''} ${hasDetail ? 'has-detail' : ''}" ${hasDetail ? 'data-href="/pages/reports/report-editor.html"' : ''}>
        <td><div class="client-cell"><div class="client-logo">${logo}</div><span>${r.client}</span></div></td>
        <td>${monthLabel(r.month)}</td>
        <td>${statusBadge(r.status)}</td>
        <td class="num">${r.tickets}</td>
        <td class="num"><span class="sla-pct ${slaClass(r.sla)}">${r.sla.toFixed(1)}%</span></td>
        <td class="num">${r.response}</td>
        <td class="num">${r.resolution}</td>
        <td class="${r.issued ? '' : 'text-muted'}">${r.issued || '—'}</td>
        <td class="${r.by ? '' : 'text-muted'}">${r.by || '—'}</td>
      </tr>`;
    }).join('');
    $('reportCount').textContent = `Showing ${rows.length} reports · SLA compliance is the share of tickets that met both response and resolution targets`;

    const missing = REPORT_CLIENTS.filter(c => !REPORTS.some(r => r.client === c.name && r.month === '2026-09'));
    const btn = $('generateReports');
    btn.disabled = missing.length === 0;
    btn.textContent = missing.length ? 'Generate reports for September' : 'September reports generated';
    btn.title = missing.length ? `Creates draft reports for ${missing.map(c => c.name).join(', ')}` : '';
  }

  // Prototype figures for newly generated drafts
  const GENERATED = {
    MediaWorks: { tickets: 61, sla: 96.7, response: '1h 50m', resolution: '17h 10m' },
    FinanceExperts: { tickets: 79, sla: 93.7, response: '44m', resolution: '7h 30m' }
  };

  $('reportRows').addEventListener('click', e => {
    const row = e.target.closest('tr[data-href]');
    if (row) window.location.href = row.dataset.href;
  });

  $('generateReports').addEventListener('click', () => {
    const missing = REPORT_CLIENTS.filter(c => !REPORTS.some(r => r.client === c.name && r.month === '2026-09'));
    if (!missing.length) return;
    REPORTS.forEach(r => { delete r.isNew; });
    missing.forEach(c => {
      REPORTS.push({ client: c.name, month: '2026-09', status: 'Draft', isNew: true, ...(GENERATED[c.name] || { tickets: 0, sla: 100, response: '—', resolution: '—' }) });
    });
    $('reportsGenerated').hidden = false;
    $('reportsGeneratedText').textContent = `✓ Generated ${missing.length} draft report${missing.length === 1 ? '' : 's'} for September 2026: ${missing.map(c => c.name).join(', ')}.`;
    render();
  });

  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initServiceReports);
} else {
  initServiceReports();
}
