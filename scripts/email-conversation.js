// Freshdesk-synced email conversation component used across service, order, and support detail pages.
// Call initEmailConversation(sectionEl, recipientFirstName) after the section is in the DOM.

// Tiny blank PDF for downloadable attachment prototypes
const FD_BLANK_PDF = 'JVBERi0xLjAKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL01lZGlhQm94WzAgMCA2MTIgNzkyXS9QYXJlbnQgMiAwIFI+PmVuZG9iagp0cmFpbGVyPDwvUm9vdCAxIDAgUi9TaXplIDQ+PgpzdGFydHhyZWYKMTc4CiUlRU9G';

// Collapse all but the 2 most recent messages; prepend an expand button.
function applyEmailCollapse(thread) {
  const messages = [...thread.querySelectorAll(':scope > .message')];
  if (messages.length <= 2) return;
  const earlier = messages.slice(0, messages.length - 2);
  earlier.forEach(m => { m.hidden = true; });
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'thread-earlier-btn';
  btn.textContent = `Show ${earlier.length} earlier message${earlier.length === 1 ? '' : 's'}`;
  btn.addEventListener('click', () => {
    earlier.forEach(m => { m.hidden = false; });
    btn.remove();
  });
  thread.prepend(btn);
}

function initEmailConversation(sectionEl, recipientName) {
  if (!sectionEl) return;

  const thread = sectionEl.querySelector('.fd-thread');
  const form   = sectionEl.querySelector('.fd-composer');
  if (!form) return;

  const textarea   = form.querySelector('.fd-reply-text');
  const ccInput    = form.querySelector('.fd-cc-input');
  const ccRow      = form.querySelector('.fd-cc-row');
  const noteEl     = form.querySelector('.fd-composer-note');
  const modeButtons = form.querySelectorAll('[data-email-mode]');

  let mode = 'reply';

  function setMode(m) {
    mode = m;
    modeButtons.forEach(b => b.classList.toggle('active', b.dataset.emailMode === m));
    form.classList.toggle('composer-internal', m === 'internal');
    if (ccRow) ccRow.hidden = m === 'internal';
    if (noteEl) noteEl.textContent = m === 'internal'
      ? 'Only visible to the Esevel team.'
      : 'Reply will be sent via Freshdesk to the client admin.';
    if (textarea) textarea.placeholder = m === 'internal'
      ? 'Note for the Esevel team\u2026'
      : `Write a reply to ${recipientName}\u2026`;
  }

  modeButtons.forEach(b => b.addEventListener('click', () => setMode(b.dataset.emailMode)));

  // Collapse older messages on load
  if (thread) applyEmailCollapse(thread);

  // "Start conversation" empty state button
  const startBtn = sectionEl.querySelector('[data-email-start]');
  if (startBtn) {
    const emptyState   = sectionEl.querySelector('.email-empty-state');
    const composerWrap = sectionEl.querySelector('.fd-composer-wrap');
    startBtn.addEventListener('click', () => {
      if (emptyState) emptyState.hidden = true;
      if (composerWrap) composerWrap.hidden = false;
      textarea?.focus();
    });
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function avatarInitials(name) {
    return name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!thread) return;
    const text = textarea.value.trim();
    if (!text) return;
    const cc = ccInput ? ccInput.value.trim() : '';
    const internal = mode === 'internal';

    const msg = document.createElement('div');
    msg.className = `message${internal ? ' message-internal' : ''}`;
    msg.innerHTML = `
      <div class="activity-avatar note-avatar">${avatarInitials('Me')}</div>
      <div class="message-body">
        <div class="activity-header">
          <strong>You</strong>
          <span class="activity-tag${internal ? ' tag-internal' : ''}">${internal ? 'Internal note' : 'Esevel Support'}</span>
          <span class="activity-time">Just now</span>
        </div>
        ${!internal ? `<div class="message-meta">you@esevel.com${cc ? ` &middot; CC: ${escHtml(cc)}` : ''}</div>` : ''}
        <div class="message-text">${escHtml(text)}</div>
      </div>`;
    thread.appendChild(msg);
    textarea.value = '';
    msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

// Build a standard email message node (used for static pages that prefer JS-side construction)
function fdMessage({ name, email, cc, kind, at, text, attachments }) {
  const isClient = kind === 'client';
  const isInternal = kind === 'internal';
  const avatar = name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
  const tagLabel = isInternal ? 'Internal note' : isClient ? 'Client admin' : 'Esevel Support';
  const tagClass = isInternal ? 'activity-tag tag-internal' : 'activity-tag';

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const attachHtml = (attachments || []).map(a => {
    const href = `data:application/pdf;base64,${FD_BLANK_PDF}`;
    return `<a href="${href}" download="${esc(a.name)}" class="attachment-chip">📎 ${esc(a.name)} <span class="attachment-size">${esc(a.size)}</span></a>`;
  }).join('');

  const metaParts = [];
  if (email) metaParts.push(esc(email));
  if (cc) metaParts.push(`CC: ${esc(cc)}`);

  const div = document.createElement('div');
  div.className = `message${isInternal ? ' message-internal' : ''}`;
  div.innerHTML = `
    <div class="activity-avatar note-avatar${isClient ? ' msg-avatar-client' : ''}">${esc(avatar)}</div>
    <div class="message-body">
      <div class="activity-header">
        <strong>${esc(name)}</strong>
        <span class="${tagClass}">${tagLabel}</span>
        <span class="activity-time">${esc(at)}</span>
      </div>
      ${metaParts.length ? `<div class="message-meta">${metaParts.join(' &middot; ')}</div>` : ''}
      <div class="message-text">${esc(text)}</div>
      ${attachHtml ? `<div class="message-attachments">${attachHtml}</div>` : ''}
    </div>`;
  return div;
}
