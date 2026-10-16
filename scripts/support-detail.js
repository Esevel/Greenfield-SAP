// Support request detail: reply/internal composer, waiting-on-client pause, resolve

function initSupportDetail() {
  const $ = id => document.getElementById(id);
  const thread = $('thread');
  let mode = 'reply';
  let state = 'progress';

  document.querySelectorAll('#composerMode .segment-button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#composerMode .segment-button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mode = btn.dataset.mode;
      const internal = mode === 'internal';
      $('composer').classList.toggle('composer-internal', internal);
      $('composerText').placeholder = internal ? 'Add a note for the Esevel team...' : 'Write a reply to Priya...';
      $('composerHint').textContent = internal ? 'Only visible to Esevel staff.' : 'Visible to the requester and client admin.';
      $('composerSend').textContent = internal ? 'Add note' : 'Send reply';
    });
  });

  $('hideInternal').addEventListener('change', e => {
    thread.classList.toggle('hide-internal', e.target.checked);
  });

  $('composer').addEventListener('submit', e => {
    e.preventDefault();
    const text = $('composerText').value.trim();
    if (!text) return;
    const internal = mode === 'internal';

    const msg = document.createElement('div');
    msg.className = `message${internal ? ' message-internal' : ''}`;
    const avatar = document.createElement('div');
    avatar.className = 'activity-avatar note-avatar';
    avatar.textContent = 'Y';
    const body = document.createElement('div');
    body.className = 'message-body';
    const head = document.createElement('div');
    head.className = 'activity-header';
    const who = document.createElement('strong');
    who.textContent = 'You';
    const tag = document.createElement('span');
    tag.className = `activity-tag${internal ? ' tag-internal' : ''}`;
    tag.textContent = internal ? 'Internal note' : 'Esevel Support';
    const when = document.createElement('span');
    when.className = 'activity-time';
    when.textContent = 'Just now';
    head.append(who, tag, when);
    const textEl = document.createElement('div');
    textEl.className = 'message-text';
    textEl.textContent = text;
    body.append(head, textEl);
    msg.append(avatar, body);
    thread.appendChild(msg);
    $('composerText').value = '';
  });

  function setStage(id, cls) {
    ['stageProgress', 'stageWaiting', 'stageResolved'].forEach(s => $(s).classList.remove('current', 'current-risk', 'current-paused', 'done'));
    if (cls === 'paused') {
      $('stageProgress').classList.add('done');
      $('stageWaiting').classList.add('current', 'current-paused');
    } else if (cls === 'resolved') {
      ['stageProgress', 'stageWaiting'].forEach(s => $(s).classList.add('done'));
      $('stageResolved').classList.add('current', 'current-done');
    } else {
      $('stageProgress').classList.add('current', 'current-risk');
    }
  }

  function render() {
    const clock = $('resolutionClock');
    const value = clock.lastElementChild;
    clock.className = 'sla-clock';
    if (state === 'waiting') {
      clock.classList.add('clock-paused');
      value.textContent = '⏸ Paused · waiting on client';
      $('statusBadge').className = 'badge badge-muted';
      $('statusBadge').textContent = 'Waiting on Client';
      $('slaPill').className = 'sla-pill sla-paused';
      $('slaPill').textContent = 'Paused';
      $('slaNote').textContent = '52m of resolution time left when paused. Resumes when Priya replies.';
      $('waitingBtn').textContent = 'Resume (client replied)';
      setStage(null, 'paused');
    } else if (state === 'resolved') {
      clock.classList.add('clock-met');
      value.textContent = '✓ Met · 7h 08m';
      $('statusBadge').className = 'badge badge-success';
      $('statusBadge').textContent = 'Resolved';
      $('slaPill').className = 'sla-pill sla-ok';
      $('slaPill').textContent = 'Met';
      $('slaNote').textContent = 'Resolved within the 8h target.';
      $('waitingBtn').hidden = true;
      $('resolveBtn').textContent = 'Reopen';
      setStage(null, 'resolved');
    } else {
      clock.classList.add('clock-risk');
      value.textContent = '52m left';
      $('statusBadge').className = 'badge badge-info';
      $('statusBadge').textContent = 'In Progress';
      $('slaPill').className = 'sla-pill sla-risk';
      $('slaPill').textContent = 'At risk';
      $('slaNote').textContent = 'Due today, 17:12 SGT. Clocks pause while waiting on the client.';
      $('waitingBtn').hidden = false;
      $('waitingBtn').textContent = 'Set waiting on client';
      $('resolveBtn').textContent = 'Resolve';
      setStage(null, 'progress');
    }
  }

  $('waitingBtn').addEventListener('click', () => {
    state = state === 'waiting' ? 'progress' : 'waiting';
    render();
  });

  $('resolveBtn').addEventListener('click', () => {
    state = state === 'resolved' ? 'progress' : 'resolved';
    render();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSupportDetail);
} else {
  initSupportDetail();
}
