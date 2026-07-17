// Shared login/register modal behavior.

function initAuthModals() {
  const modal = document.getElementById('auth-modal');
  const closeBtn = document.getElementById('auth-modal-close');
  ensureRegisterEmailField();
  normalizeAuthModalText();

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) {
        modal.style.display = 'none';
      }
    });
  }

  // Swap login/register tabs
  document.getElementById('switch-to-register')?.addEventListener('click', () => {
    switchAuthView('register');
  });

  document.getElementById('switch-to-login')?.addEventListener('click', () => {
    switchAuthView('login');
  });

  // Form submit: Login
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errMsg = document.getElementById('login-error-message');

    if (errMsg) errMsg.style.display = 'none';

    try {
      const res = await apiFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(data.user));

        modal.style.display = 'none';
        window.location.reload();
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (errMsg) {
          errMsg.querySelector('.msg-txt').textContent = errorData.message || t('auth.loginError', 'T\u00e0i kho\u1ea3n ho\u1eb7c m\u1eadt kh\u1ea9u kh\u00f4ng ch\u00ednh x\u00e1c.');
          errMsg.style.display = 'flex';
        }
      }
    } catch (err) {
      console.error(err);
      if (errMsg) {
        errMsg.querySelector('.msg-txt').textContent = t('common.unknownError', 'L\u1ed7i k\u1ebft n\u1ed1i m\u00e1y ch\u1ee7.');
        errMsg.style.display = 'flex';
      }
    }
  });

  // Form submit: Register
  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email')?.value.trim() || '';
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const errMsg = document.getElementById('register-error-message');

    if (errMsg) errMsg.style.display = 'none';

    if (!/^[A-Za-z0-9_-]{3,24}$/.test(username)) {
      if (errMsg) {
        errMsg.querySelector('.msg-txt').textContent = 'T\u00ean \u0111\u0103ng nh\u1eadp ph\u1ea3i d\u00e0i 3-24 k\u00fd t\u1ef1 v\u00e0 ch\u1ec9 g\u1ed3m ch\u1eef, s\u1ed1, d\u1ea5u g\u1ea1ch d\u01b0\u1edbi ho\u1eb7c g\u1ea1ch ngang.';
        errMsg.style.display = 'flex';
      }
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (errMsg) {
        errMsg.querySelector('.msg-txt').textContent = 'Vui l\u00f2ng nh\u1eadp email h\u1ee3p l\u1ec7.';
        errMsg.style.display = 'flex';
      }
      return;
    }

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      if (errMsg) {
        errMsg.querySelector('.msg-txt').textContent = 'M\u1eadt kh\u1ea9u ph\u1ea3i c\u00f3 \u00edt nh\u1ea5t 8 k\u00fd t\u1ef1, g\u1ed3m ch\u1eef v\u00e0 s\u1ed1.';
        errMsg.style.display = 'flex';
      }
      return;
    }

    if (password !== confirmPassword) {
      if (errMsg) {
        errMsg.querySelector('.msg-txt').textContent = t('profile.passwordMismatch', 'M\u1eadt kh\u1ea9u x\u00e1c nh\u1eadn kh\u00f4ng kh\u1edbp.');
        errMsg.style.display = 'flex';
      }
      return;
    }

    try {
      const res = await apiFetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({ username, email, password })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          currentUser = data.user;
          localStorage.setItem('user', JSON.stringify(data.user));
          modal.style.display = 'none';
          window.location.reload();
        } else {
          showToast(t('auth.registerSuccess', '\u0110\u0103ng k\u00fd t\u00e0i kho\u1ea3n th\u00e0nh c\u00f4ng! H\u00e3y \u0111\u0103ng nh\u1eadp.'), 'success');
          switchAuthView('login');
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (errMsg) {
          errMsg.querySelector('.msg-txt').textContent = errorData.message || t('auth.registerError', '\u0110\u0103ng k\u00fd kh\u00f4ng th\u00e0nh c\u00f4ng.');
          errMsg.style.display = 'flex';
        }
      }
    } catch (err) {
      console.error(err);
      if (errMsg) {
        errMsg.querySelector('.msg-txt').textContent = 'L\u1ed7i k\u1ebft n\u1ed1i m\u00e1y ch\u1ee7.';
        errMsg.style.display = 'flex';
      }
    }
  });
}

function normalizeAuthModalText() {
  const loginView = document.getElementById('auth-modal-login-view');
  const registerView = document.getElementById('auth-modal-register-view');
  const closeBtn = document.getElementById('auth-modal-close');
  if (closeBtn) closeBtn.title = '\u0110\u00f3ng';

  if (loginView) {
    loginView.querySelector('h3') && (loginView.querySelector('h3').textContent = '\u0110\u0103ng nh\u1eadp');
    const username = document.getElementById('login-username');
    const password = document.getElementById('login-password');
    setAuthInputLabel(username, 'T\u00ean \u0111\u0103ng nh\u1eadp ho\u1eb7c email');
    setAuthInputLabel(password, 'M\u1eadt kh\u1ea9u');
    if (username) username.placeholder = 'Nh\u1eadp t\u00ean \u0111\u0103ng nh\u1eadp ho\u1eb7c email...';
    if (password) password.placeholder = 'Nh\u1eadp m\u1eadt kh\u1ea9u...';
    const submit = loginView.querySelector('button[type="submit"]');
    if (submit) submit.textContent = '\u0110\u0103ng nh\u1eadp';
    const loginError = document.querySelector('#login-error-message .msg-txt');
    if (loginError) loginError.textContent = 'T\u00ean \u0111\u0103ng nh\u1eadp/email ho\u1eb7c m\u1eadt kh\u1ea9u kh\u00f4ng ch\u00ednh x\u00e1c.';
    const switchRegister = document.getElementById('switch-to-register');
    if (switchRegister) {
      const parent = switchRegister.parentElement;
      if (parent) parent.innerHTML = 'Ch\u01b0a c\u00f3 t\u00e0i kho\u1ea3n? <span id="switch-to-register" style="color: var(--accent-primary); cursor: pointer; font-weight: 600;">\u0110\u0103ng k\u00fd ngay</span>';
    }
  }

  if (registerView) {
    registerView.querySelector('h3') && (registerView.querySelector('h3').textContent = '\u0110\u0103ng k\u00fd');
    const username = document.getElementById('register-username');
    const email = document.getElementById('register-email');
    const password = document.getElementById('register-password');
    const confirm = document.getElementById('register-confirm-password');
    setAuthInputLabel(username, 'T\u00ean \u0111\u0103ng nh\u1eadp');
    setAuthInputLabel(email, 'Email');
    setAuthInputLabel(password, 'M\u1eadt kh\u1ea9u');
    setAuthInputLabel(confirm, 'X\u00e1c nh\u1eadn m\u1eadt kh\u1ea9u');
    if (username) username.placeholder = '3-24 k\u00fd t\u1ef1, ch\u1eef/s\u1ed1/_/-';
    if (email) email.placeholder = 'name@example.com';
    if (password) password.placeholder = '\u00cdt nh\u1ea5t 8 k\u00fd t\u1ef1, g\u1ed3m ch\u1eef v\u00e0 s\u1ed1';
    if (confirm) confirm.placeholder = 'Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u...';
    const submit = registerView.querySelector('button[type="submit"]');
    if (submit) submit.textContent = '\u0110\u0103ng k\u00fd';
    const registerError = document.querySelector('#register-error-message .msg-txt');
    if (registerError) registerError.textContent = '\u0110\u0103ng k\u00fd kh\u00f4ng th\u00e0nh c\u00f4ng.';
    const switchLogin = document.getElementById('switch-to-login');
    if (switchLogin) {
      const parent = switchLogin.parentElement;
      if (parent) parent.innerHTML = '\u0110\u00e3 c\u00f3 t\u00e0i kho\u1ea3n? <span id="switch-to-login" style="color: var(--accent-primary); cursor: pointer; font-weight: 600;">\u0110\u0103ng nh\u1eadp</span>';
    }
  }
}

function setAuthInputLabel(input, text) {
  const label = input?.closest('.form-group')?.querySelector('.form-label');
  if (label) label.textContent = text;
}

function ensureRegisterEmailField() {
  const registerForm = document.getElementById('register-form');
  const usernameInput = document.getElementById('register-username');
  if (!registerForm || !usernameInput || document.getElementById('register-email')) return;

  const emailGroup = document.createElement('div');
  emailGroup.className = 'form-group';
  emailGroup.innerHTML = `
    <label class="form-label">Email</label>
    <input type="email" id="register-email" class="form-control" placeholder="name@example.com" required autocomplete="email" />
  `;
  usernameInput.closest('.form-group')?.insertAdjacentElement('afterend', emailGroup);
}

function openAuthModal(viewMode = 'login') {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  modal.style.display = 'flex';
  switchAuthView(viewMode);
}

function switchAuthView(viewMode) {
  const loginView = document.getElementById('auth-modal-login-view');
  const registerView = document.getElementById('auth-modal-register-view');

  if (viewMode === 'login') {
    if (loginView) loginView.style.display = 'block';
    if (registerView) registerView.style.display = 'none';
  } else {
    if (loginView) loginView.style.display = 'none';
    if (registerView) registerView.style.display = 'block';
  }
}
