// Request detail pages: stage owner picker and handover notes

function initRequestHandover() {
  const initials = name => (name === 'Unassigned' ? '?' : name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase());

  document.querySelectorAll('.owner-picker').forEach(picker => {
    const select = picker.querySelector('select');
    const avatar = picker.querySelector('.card-avatar');
    select.addEventListener('change', () => { avatar.textContent = initials(select.value); });
  });

  document.querySelectorAll('.handover-card').forEach(card => {
    const form = card.querySelector('form');
    const input = form.querySelector('textarea');
    const feed = card.querySelector('.handover-feed');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      const item = document.createElement('div');
      item.className = 'handover-item';
      const av = document.createElement('div');
      av.className = 'card-avatar';
      av.textContent = 'Y';
      const body = document.createElement('div');
      const head = document.createElement('div');
      head.className = 'activity-header';
      const who = document.createElement('strong');
      who.textContent = 'You';
      const when = document.createElement('span');
      when.className = 'activity-time';
      when.textContent = 'Just now';
      head.append(who, when);
      const msg = document.createElement('div');
      msg.className = 'activity-message';
      msg.textContent = text;
      body.append(head, msg);
      item.append(av, body);
      feed.prepend(item);
      input.value = '';
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRequestHandover);
} else {
  initRequestHandover();
}
