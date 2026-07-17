const I18N = {
  locale: 'vi',
  strings: {},

  async init() {
    const saved = localStorage.getItem('locale') || 'vi';
    await this.load(saved);
  },

  async load(locale) {
    try {
      const res = await fetch(`/locales/${locale}.json?v=3.9`, { cache: 'no-store' });
      if (!res.ok) return;
      this.strings = await res.json();
      this.locale = locale;
      localStorage.setItem('locale', locale);
      document.documentElement.lang = locale === 'en' ? 'en' : 'vi';
      this.apply();
      this.updateLangButton();
      this.updateHtmlLang();
    } catch (e) {
      console.error('i18n load error:', e);
    }
  },

  t(key, fallback) {
    if (!key) return '';
    return this.strings[key] || fallback || key;
  },

  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const attr = el.getAttribute('data-i18n-attr');
      const text = this.t(key);
      if (attr === 'placeholder') {
        el.placeholder = text;
      } else if (attr === 'title') {
        el.title = text;
      } else if (attr === 'value') {
        el.value = text;
      } else if (attr === 'alt') {
        el.alt = text;
      } else {
        el.textContent = text;
      }
    });
  },

  updateLangButton() {
    const btn = document.getElementById('lang-toggle-btn');
    if (btn) {
      btn.textContent = this.t('lang.switch');
      btn.title = this.locale === 'vi' ? 'Switch to English' : 'Chuy\u1ec3n sang Ti\u1ebfng Vi\u1ec7t';
    }
  },

  updateHtmlLang() {
    document.documentElement.lang = this.locale === 'en' ? 'en' : 'vi';
  },

  async toggle() {
    const next = this.locale === 'vi' ? 'en' : 'vi';
    await this.load(next);
    if (typeof renderHeaderUserArea === 'function') renderHeaderUserArea();
    if (typeof onLocaleChanged === 'function') onLocaleChanged();
    window.dispatchEvent(new CustomEvent('manganpk:localechanged'));
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
};

window.t = (key, fallback) => I18N.t(key, fallback);
