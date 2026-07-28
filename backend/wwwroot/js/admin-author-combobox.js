(() => {
  const escapeHtml = value => String(value ?? '').replace(
    /[&<>"']/g,
    character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])
  );

  function create(options) {
    const input = document.getElementById(options.inputId);
    const valueInput = document.getElementById(options.valueId);
    const list = document.getElementById(options.listId);
    let matches = [];
    let activeIndex = -1;

    if (!input || !valueInput || !list) {
      return {
        getSelectedId: () => null,
        getSelectedName: () => '',
        reset: () => {},
        refresh: () => {}
      };
    }

    function getItems() {
      const items = options.getItems?.();
      return Array.isArray(items) ? items : [];
    }

    function getSelectedId() {
      const id = Number(valueInput.value || 0);
      return id > 0 && getItems().some(item => Number(item.id) === id) ? id : null;
    }

    function getSelectedName() {
      const id = getSelectedId();
      return id ? getItems().find(item => Number(item.id) === id)?.name || '' : '';
    }

    function getMatches() {
      const query = input.value.trim().toLocaleLowerCase();
      return getItems()
        .filter(item => !query || String(item.name || '').toLocaleLowerCase().includes(query))
        .slice(0, 8);
    }

    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      activeIndex = -1;
    }

    function select(index) {
      const item = matches[index];
      if (!item) return;
      input.value = item.name;
      valueInput.value = String(item.id);
      close();
      input.focus();
    }

    function render() {
      matches = getMatches();
      if (activeIndex >= matches.length) activeIndex = matches.length - 1;
      list.innerHTML = matches.length
        ? matches.map((item, index) => `<button type="button" class="admin-author-combobox-option${index === activeIndex ? ' active' : ''}" role="option" aria-selected="${index === activeIndex}" data-author-result="${index}">${escapeHtml(item.name)}</button>`).join('')
        : `<div class="admin-author-combobox-empty">${escapeHtml(options.emptyText?.() || '')}</div>`;
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      list.querySelectorAll('[data-author-result]').forEach(button => {
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', () => select(Number(button.dataset.authorResult)));
      });
      list.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
    }

    function open() {
      activeIndex = -1;
      render();
    }

    function reset() {
      input.value = '';
      valueInput.value = '';
      close();
    }

    function refresh() {
      const id = getSelectedId();
      if (id) input.value = getSelectedName();
      if (!list.hidden) render();
    }

    input.addEventListener('focus', open);
    input.addEventListener('input', () => {
      valueInput.value = '';
      activeIndex = -1;
      render();
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (list.hidden) open();
        activeIndex = Math.min(activeIndex + 1, matches.length - 1);
        render();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        render();
      } else if (event.key === 'Enter' && activeIndex >= 0) {
        event.preventDefault();
        select(activeIndex);
      } else if (event.key === 'Escape') {
        close();
      }
    });
    document.addEventListener('click', event => {
      if (!input.contains(event.target) && !list.contains(event.target)) close();
    });

    return { getSelectedId, getSelectedName, reset, refresh };
  }

  window.AdminAuthorCombobox = { create };
})();
