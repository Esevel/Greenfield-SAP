(() => {
  const ACCOUNT_EMAIL = 'demo@esevel.site';
  const ACCOUNT_PASSWORD_SHA256 = '5b895e5785223e184ddfd830856a27311c7fff3d802d2eb2dc9e05afe41e9868';
  const SESSION_KEY = 'greenfield-demo-auth';
  const isLoginPage = window.location.pathname === '/login.html';

  if (isLoginPage) {
    const bindLoginForm = () => {
      const form = document.getElementById('loginForm');
      if (!form) return;

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const emailInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const error = document.getElementById('loginError');
        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;
        error.textContent = '';

        if (!email || !password) {
          error.textContent = 'Enter your username and password.';
          return;
        }

        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
        const passwordHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
        if (email !== ACCOUNT_EMAIL || passwordHash !== ACCOUNT_PASSWORD_SHA256) {
          error.textContent = 'The username or password is incorrect.';
          passwordInput.focus();
          return;
        }

        localStorage.setItem(SESSION_KEY, JSON.stringify({ email: ACCOUNT_EMAIL, authenticatedAt: Date.now() }));
        const requestedPath = new URLSearchParams(window.location.search).get('next');
        const nextPath = requestedPath && requestedPath.startsWith('/') && !requestedPath.startsWith('//')
          ? requestedPath
          : '/';
        window.location.replace(nextPath);
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindLoginForm, { once: true });
    } else {
      bindLoginForm();
    }
    return;
  }

  let session = null;
  try {
    session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }

  if (!session || session.email !== ACCOUNT_EMAIL) {
    const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(`/login.html?next=${encodeURIComponent(next)}`);
    return;
  }

  document.addEventListener('click', (event) => {
    const signOut = event.target.closest('[data-signout]');
    if (!signOut) return;
    event.preventDefault();
    localStorage.removeItem(SESSION_KEY);
    window.location.replace('/login.html');
  });
})();
