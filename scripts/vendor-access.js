// Vendor Access tab: access method selector and invite panel

const ACCESS_HELP = {
  portal: 'Vendor staff update work orders in the portal. No system integration.',
  integration: 'Updates arrive from the vendor\'s system. No portal logins.',
  both: 'Vendor staff use the portal and systems send updates by integration.'
};

function initVendorAccess() {
  const portalCard = document.getElementById('portalCard');
  const integrationCard = document.getElementById('integrationCard');

  document.querySelectorAll('#accessMethod .segment-button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#accessMethod .segment-button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const method = btn.dataset.method;
      portalCard.hidden = method === 'integration';
      integrationCard.hidden = method === 'portal';
      document.getElementById('accessHelp').textContent = ACCESS_HELP[method];
    });
  });

  const panel = document.getElementById('invitePanel');
  const overlay = document.getElementById('invitePanelOverlay');
  const form = document.getElementById('inviteForm');
  const email = document.getElementById('inviteEmail');
  const emailError = document.getElementById('emailError');

  function open() {
    panel.classList.add('open');
    overlay.classList.add('show');
    email.focus();
  }

  function close() {
    panel.classList.remove('open');
    overlay.classList.remove('show');
    form.reset();
    emailError.hidden = true;
  }

  document.getElementById('openInvite').addEventListener('click', open);
  document.getElementById('closeInvite').addEventListener('click', close);
  document.getElementById('cancelInvite').addEventListener('click', close);
  overlay.addEventListener('click', close);

  // Send invite adds an "Invited" row to the table (prototype only)
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!email.checkValidity() || !email.value.trim()) {
      emailError.hidden = false;
      email.focus();
      return;
    }

    const flags = [...form.querySelectorAll('input[name="country"]:checked')].map(c => c.value);
    const row = document.createElement('tr');
    const cells = [
      () => { const td = document.createElement('td'); td.textContent = email.value.split('@')[0]; const sub = document.createElement('div'); sub.className = 'user-cell-email'; sub.textContent = email.value; td.appendChild(sub); return td; },
      () => { const td = document.createElement('td'); td.textContent = document.getElementById('inviteRole').value; return td; },
      () => { const td = document.createElement('td'); td.className = 'flag-list'; flags.forEach(f => { const s = document.createElement('span'); s.className = 'flag'; s.textContent = f; td.appendChild(s); }); if (!flags.length) td.textContent = '—'; return td; },
      () => { const td = document.createElement('td'); td.className = 'num text-muted'; td.textContent = '0'; return td; },
      () => { const td = document.createElement('td'); td.innerHTML = '<span class="badge badge-info badge-sm">Invited</span>'; return td; },
      () => { const td = document.createElement('td'); td.className = 'text-muted'; td.textContent = 'Never · invited just now'; return td; },
      () => { const td = document.createElement('td'); td.innerHTML = '<button class="btn-icon">⋯</button>'; return td; }
    ];
    cells.forEach(make => row.appendChild(make()));
    document.querySelector('#portalUsers tbody').prepend(row);

    const count = portalCard.querySelector('.tab-count');
    count.textContent = Number(count.textContent) + 1;
    close();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVendorAccess);
} else {
  initVendorAccess();
}
