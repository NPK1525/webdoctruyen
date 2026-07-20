// Shared login/register/password-reset modal behavior.

let passwordResetEmail = '';
let passwordResetToken = '';

function initAuthModals() {
  const modal = document.getElementById('auth-modal');
  const closeBtn = document.getElementById('auth-modal-close');
  ensurePasswordResetViews();
  ensurePasswordVisibilityControls();
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

  document.getElementById('switch-to-forgot')?.addEventListener('click', () => {
    clearPasswordResetState();
    switchAuthView('forgot-request');
  });

  document.querySelectorAll('[data-auth-back-login]').forEach(button => {
    button.addEventListener('click', () => {
      clearPasswordResetState();
      switchAuthView('login');
    });
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

  document.getElementById('forgot-request-form')?.addEventListener('submit', submitForgotRequest);
  document.getElementById('forgot-resend')?.addEventListener('click', resendForgotOtp);
  document.getElementById('forgot-otp-form')?.addEventListener('submit', submitForgotOtp);
  document.getElementById('forgot-reset-form')?.addEventListener('submit', submitForgotReset);
  [
    ['login-password', 'toggle-login-password'],
    ['register-password', 'toggle-register-password'],
    ['register-confirm-password', 'toggle-register-confirm-password'],
    ['forgot-new-password', 'toggle-forgot-new-password'],
    ['forgot-confirm-password', 'toggle-forgot-confirm-password']
  ].forEach(([inputId, buttonId]) => {
    document.getElementById(buttonId)?.addEventListener('click', () => togglePasswordVisibility(inputId, buttonId));
  });
}

function togglePasswordVisibility(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  if (!input || !button) return;
  const visible = input.type === 'text';
  input.type = visible ? 'password' : 'text';
  button.setAttribute('aria-label', visible ? 'Hiển thị mật khẩu' : 'Ẩn mật khẩu');
  button.setAttribute('title', visible ? 'Hiển thị mật khẩu' : 'Ẩn mật khẩu');
  const icon = button.querySelector('[data-lucide]');
  if (icon) icon.setAttribute('data-lucide', visible ? 'eye' : 'eye-off');
  if (window.lucide) window.lucide.createIcons();
}

async function submitForgotRequest(event) {
  event.preventDefault();
  const email = document.getElementById('forgot-email')?.value.trim() || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setPasswordResetMessage('forgot-request-message', 'Vui lòng nhập email hợp lệ.');
    return;
  }

  passwordResetEmail = email;
  await requestForgotOtp();
}

async function requestForgotOtp() {
  const submit = document.querySelector('#forgot-request-form button[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    const response = await apiFetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email: passwordResetEmail })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Không thể gửi mã OTP.');
    setPasswordResetMessage('forgot-request-message', payload.message || 'Nếu email tồn tại, mã OTP đã được gửi.', true);
    switchAuthView('forgot-otp');
  } catch (error) {
    setPasswordResetMessage('forgot-request-message', error.message || 'Không thể gửi mã OTP.');
  } finally {
    if (submit) submit.disabled = false;
  }
}

async function resendForgotOtp() {
  if (!passwordResetEmail) {
    switchAuthView('forgot-request');
    return;
  }
  await requestForgotOtp();
}

async function submitForgotOtp(event) {
  event.preventDefault();
  const otp = document.getElementById('forgot-otp')?.value.trim() || '';
  if (!/^\d{6}$/.test(otp)) {
    setPasswordResetMessage('forgot-otp-message', 'Mã OTP phải gồm đúng 6 chữ số.');
    return;
  }

  const submit = event.currentTarget.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    const response = await apiFetch(`${API_BASE}/auth/verify-reset-otp`, {
      method: 'POST',
      body: JSON.stringify({ email: passwordResetEmail, otp })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
    passwordResetToken = payload.resetToken || '';
    switchAuthView('forgot-reset');
  } catch (error) {
    setPasswordResetMessage('forgot-otp-message', error.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
  } finally {
    if (submit) submit.disabled = false;
  }
}

async function submitForgotReset(event) {
  event.preventDefault();
  const password = document.getElementById('forgot-new-password')?.value || '';
  const confirmPassword = document.getElementById('forgot-confirm-password')?.value || '';
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    setPasswordResetMessage('forgot-reset-message', 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số.');
    return;
  }
  if (password !== confirmPassword) {
    setPasswordResetMessage('forgot-reset-message', 'Mật khẩu xác nhận không khớp.');
    return;
  }

  const submit = event.currentTarget.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    const response = await apiFetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ email: passwordResetEmail, resetToken: passwordResetToken, password, confirmPassword })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Không thể đổi mật khẩu.');
    clearPasswordResetState();
    switchAuthView('login');
    showToast(payload.message || 'Đổi mật khẩu thành công.', true);
  } catch (error) {
    setPasswordResetMessage('forgot-reset-message', error.message || 'Không thể đổi mật khẩu.');
  } finally {
    if (submit) submit.disabled = false;
  }
}

function setPasswordResetMessage(id, message, success = false) {
  const element = document.getElementById(id);
  if (!element) return;
  element.classList.toggle('visible', Boolean(message));
  element.classList.toggle('success', success);
  const text = element.querySelector('.msg-txt');
  if (text) text.textContent = message;
}

function clearPasswordResetState() {
  passwordResetEmail = '';
  passwordResetToken = '';
  ['forgot-email', 'forgot-otp', 'forgot-new-password', 'forgot-confirm-password'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });
  ['forgot-request-message', 'forgot-otp-message', 'forgot-reset-message'].forEach(id => setPasswordResetMessage(id, ''));
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
  const views = {
    login: loginView,
    register: registerView,
    'forgot-request': document.getElementById('auth-modal-forgot-request-view'),
    'forgot-otp': document.getElementById('auth-modal-forgot-otp-view'),
    'forgot-reset': document.getElementById('auth-modal-forgot-reset-view')
  };
  Object.values(views).forEach(view => { if (view) view.style.display = 'none'; });
  if (views[viewMode]) views[viewMode].style.display = 'block';
}

function ensurePasswordVisibilityControls() {
  const fields = [
    ['login-password', 'toggle-login-password'],
    ['register-password', 'toggle-register-password'],
    ['register-confirm-password', 'toggle-register-confirm-password'],
    ['forgot-new-password', 'toggle-forgot-new-password'],
    ['forgot-confirm-password', 'toggle-forgot-confirm-password']
  ];

  fields.forEach(([inputId, buttonId]) => {
    const input = document.getElementById(inputId);
    if (!input || document.getElementById(buttonId)) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'password-input-wrap';
    input.parentNode?.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    const button = document.createElement('button');
    button.type = 'button';
    button.id = buttonId;
    button.className = 'password-visibility-toggle';
    button.setAttribute('aria-label', 'Hiển thị mật khẩu');
    button.title = 'Hiển thị mật khẩu';
    button.innerHTML = '<i data-lucide="eye"></i>';
    wrapper.appendChild(button);
  });
}

function ensurePasswordResetViews() {
  const modal = document.getElementById('auth-modal');
  const loginView = document.getElementById('auth-modal-login-view');
  if (!modal || !loginView || document.getElementById('auth-modal-forgot-request-view')) return;

  const passwordGroup = document.getElementById('login-password')?.closest('.form-group');
  if (passwordGroup && !document.getElementById('switch-to-forgot')) {
    const link = document.createElement('div');
    link.style.cssText = 'text-align:right;margin-top:-6px;';
    link.innerHTML = '<button type="button" id="switch-to-forgot" class="auth-text-button">Quên mật khẩu?</button>';
    passwordGroup.insertAdjacentElement('afterend', link);
  }

  const card = modal.querySelector('.glass-card') || modal;
  card.style.maxHeight = 'calc(100vh - 40px)';
  card.style.overflowY = 'auto';
  card.insertAdjacentHTML('beforeend', `
    <div id="auth-modal-forgot-request-view" style="display:none">
      <h3>Quên mật khẩu</h3>
      <p class="auth-flow-description">Nhập email đã đăng ký để nhận mã OTP.</p>
      <div id="forgot-request-message" class="auth-flow-message"><span class="msg-txt"></span></div>
      <form id="forgot-request-form"><div class="form-group"><label class="form-label">Email</label><input type="email" id="forgot-email" class="form-control" required autocomplete="email"></div><button type="submit" class="btn btn-primary auth-flow-submit">Gửi mã OTP</button></form>
      <button type="button" class="auth-text-button auth-flow-back" data-auth-back-login>Quay lại đăng nhập</button>
    </div>
    <div id="auth-modal-forgot-otp-view" style="display:none">
      <h3>Nhập mã OTP</h3><p class="auth-flow-description">Mã gồm 6 chữ số và có hiệu lực trong 10 phút.</p>
      <div id="forgot-otp-message" class="auth-flow-message"><span class="msg-txt"></span></div>
      <form id="forgot-otp-form"><div class="form-group"><label class="form-label">Mã OTP</label><input type="text" id="forgot-otp" class="form-control auth-otp-input" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" required autocomplete="one-time-code"></div><button type="submit" class="btn btn-primary auth-flow-submit">Xác nhận OTP</button></form>
      <div class="auth-flow-links"><button type="button" id="forgot-resend" class="auth-text-button">Gửi lại mã</button><button type="button" class="auth-text-button" data-auth-back-login>Quay lại đăng nhập</button></div>
    </div>
    <div id="auth-modal-forgot-reset-view" style="display:none">
      <h3>Tạo mật khẩu mới</h3><p class="auth-flow-description">Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số.</p>
      <div id="forgot-reset-message" class="auth-flow-message"><span class="msg-txt"></span></div>
      <form id="forgot-reset-form"><div class="form-group"><label class="form-label">Mật khẩu mới</label><input type="password" id="forgot-new-password" class="form-control" minlength="8" maxlength="128" required autocomplete="new-password"></div><div class="form-group"><label class="form-label">Xác nhận mật khẩu</label><input type="password" id="forgot-confirm-password" class="form-control" minlength="8" maxlength="128" required autocomplete="new-password"></div><button type="submit" class="btn btn-primary auth-flow-submit">Đổi mật khẩu</button></form>
      <button type="button" class="auth-text-button auth-flow-back" data-auth-back-login>Hủy và quay lại</button>
    </div>`);
}
