(() => {
  const emptyGroup = () => ({ include: [], exclude: [] });

  function emptyState() {
    return {
      tags: {
        format: emptyGroup(),
        genre: emptyGroup(),
        theme: emptyGroup(),
        content: emptyGroup()
      },
      authors: [],
      artists: []
    };
  }

  function cycleTagState(current) {
    return current === 'neutral' ? 'include'
      : current === 'include' ? 'exclude'
      : 'neutral';
  }

  function normalizeList(values) {
    return [...new Set((Array.isArray(values) ? values : [])
      .map(value => String(value).trim())
      .filter(Boolean))];
  }

  function serializeState(state) {
    const query = {};
    const tags = state?.tags || {};
    for (const [group, queryName] of [
      ['format', 'Formats'],
      ['genre', 'GenreIds'],
      ['theme', 'ThemeIds'],
      ['content', 'Content']
    ]) {
      const values = tags[group] || emptyGroup();
      const include = normalizeList(values.include);
      const exclude = normalizeList(values.exclude);
      if (include.length) query[`include${queryName}`] = include.join(',');
      if (exclude.length) query[`exclude${queryName}`] = exclude.join(',');
    }
    const authors = normalizeList(state?.authors);
    const artists = normalizeList(state?.artists);
    if (authors.length) query.authorIds = authors.join(',');
    if (artists.length) query.artistIds = artists.join(',');
    return query;
  }

  function resetState() {
    return emptyState();
  }

  function peopleForRole(people, role) {
    return (Array.isArray(people) ? people : []).filter(person => {
      const roles = Array.isArray(person.roles) ? person.roles : [];
      return roles.some(item => {
        const normalized = String(item || '').trim().toLocaleLowerCase();
        if (normalized === 'story & art') return true;
        return role === 'artist' ? normalized.startsWith('art') : normalized.startsWith('story');
      });
    });
  }

  function filterOptions(options, search) {
    const query = String(search || '').trim().toLocaleLowerCase();
    return (Array.isArray(options) ? options : [])
      .filter(option => !query || String(option.name || '').toLocaleLowerCase().includes(query))
      .slice(0, 8);
  }

  function parseQueryState(params) {
    const state = resetState();
    const read = (key, target) => {
      const values = String(params?.get(key) || '').split(',').map(value => value.trim()).filter(Boolean);
      state.tags[target].include = values;
    };
    const readExclude = (key, target) => {
      const values = String(params?.get(key) || '').split(',').map(value => value.trim()).filter(Boolean);
      state.tags[target].exclude = values;
    };
    read('includeFormats', 'format');
    readExclude('excludeFormats', 'format');
    read('includeGenreIds', 'genre');
    readExclude('excludeGenreIds', 'genre');
    read('includeThemeIds', 'theme');
    readExclude('excludeThemeIds', 'theme');
    read('includeContent', 'content');
    readExclude('excludeContent', 'content');
    state.authors = String(params?.get('authorIds') || '').split(',').filter(Boolean);
    state.artists = String(params?.get('artistIds') || '').split(',').filter(Boolean);
    return state;
  }

  function create(options = {}) {
    const documentRef = options.document || document;
    const translate = (key, fallback) => typeof window.t === 'function' ? window.t(key, fallback) : fallback;
    const state = { value: resetState() };
    const metadata = options.metadata || { format: [], genre: [], theme: [], content: [], people: [] };
    const tagGroupIds = {
      format: 'advanced-filter-tags-format',
      genre: 'advanced-filter-tags-genre',
      theme: 'advanced-filter-tags-theme',
      content: 'advanced-filter-tags-content'
    };
    const peopleControls = {
      author: {
        input: 'advanced-author-search',
        results: 'advanced-author-results',
        selected: 'advanced-author-selected'
      },
      artist: {
        input: 'advanced-artist-search',
        results: 'advanced-artist-results',
        selected: 'advanced-artist-selected'
      }
    };

    const get = id => documentRef.getElementById(id);
    const emitChange = () => options.onChange?.(state.value);

    function tagState(group, value) {
      const tags = state.value.tags[group];
      if (tags.include.includes(String(value))) return 'include';
      if (tags.exclude.includes(String(value))) return 'exclude';
      return 'neutral';
    }

    function setTag(group, item, nextState) {
      const values = state.value.tags[group];
      const id = String(item.id ?? item.value);
      values.include = values.include.filter(value => value !== id);
      values.exclude = values.exclude.filter(value => value !== id);
      if (nextState === 'include') values.include.push(id);
      if (nextState === 'exclude') values.exclude.push(id);
    }

    function renderTags() {
      const query = get('advanced-filter-tags-search')?.value || '';
      for (const [group, containerId] of Object.entries(tagGroupIds)) {
        const container = get(containerId);
        if (!container) continue;
        const items = filterOptions(metadata[group], query);
        container.innerHTML = items.map(item => {
          const current = tagState(group, item.id ?? item.value);
          const value = String(item.id ?? item.value);
          const label = String(item.name ?? item.label ?? value)
            .replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
          return `<button type="button" class="advanced-filter-tag ${current}" data-filter-tag="${value}" data-filter-tag-group="${group}" aria-pressed="${current !== 'neutral'}">${label}</button>`;
        }).join('') || `<span class="advanced-person-empty" data-i18n="search.noTagMatches">${translate('search.noTagMatches', 'No matching tags.')}</span>`;
        container.querySelectorAll('[data-filter-tag]').forEach(button => {
          button.addEventListener('click', () => {
            const current = tagState(group, button.dataset.filterTag);
            setTag(group, { id: button.dataset.filterTag }, cycleTagState(current));
            renderTags();
            emitChange();
          });
        });
      }
    }

    function renderPeople(role) {
      const control = peopleControls[role];
      const input = get(control.input);
      const results = get(control.results);
      const selected = get(control.selected);
      if (!input || !results || !selected) return;
      const selectedIds = state.value[role === 'author' ? 'authors' : 'artists'].map(String);
      const available = peopleForRole(metadata.people, role)
        .filter(person => !selectedIds.includes(String(person.id)));
      const items = filterOptions(available, input.value);
      results.innerHTML = items.map(person => `<button type="button" class="advanced-person-option" role="option" data-person-id="${person.id}">${String(person.name).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))}</button>`).join('') || `<div class="advanced-person-empty">${translate('search.noMatches', 'No matches.')}</div>`;
      const hasQuery = input.value.trim().length > 0;
      results.hidden = !hasQuery;
      input.setAttribute('aria-expanded', String(hasQuery));
      results.querySelectorAll('[data-person-id]').forEach(button => button.addEventListener('click', () => {
        const key = role === 'author' ? 'authors' : 'artists';
        if (!state.value[key].map(String).includes(button.dataset.personId)) state.value[key].push(button.dataset.personId);
        input.value = '';
        results.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        renderPeople(role);
        emitChange();
      }));
      selected.innerHTML = selectedIds.map(id => {
        const person = metadata.people.find(item => String(item.id) === id);
        if (!person) return '';
        const label = String(person.name).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
        return `<span class="advanced-person-chip">${label}<button type="button" data-remove-person="${id}" aria-label="Remove ${label}">&times;</button></span>`;
      }).join('');
      selected.querySelectorAll('[data-remove-person]').forEach(button => button.addEventListener('click', () => {
        const key = role === 'author' ? 'authors' : 'artists';
        state.value[key] = state.value[key].filter(id => String(id) !== button.dataset.removePerson);
        renderPeople(role);
        emitChange();
      }));
    }

    function render() {
      renderTags();
      renderPeople('author');
      renderPeople('artist');
      const includeCount = Object.values(state.value.tags).reduce((sum, group) => sum + group.include.length, 0);
      const excludeCount = Object.values(state.value.tags).reduce((sum, group) => sum + group.exclude.length, 0);
      const label = get('advanced-filter-tags-label');
      if (label) label.textContent = includeCount || excludeCount
        ? `${includeCount} ${translate('search.include', 'included')} / ${excludeCount} ${translate('search.exclude', 'excluded')}`
        : translate('search.includeAny', 'Include any');
    }

    function setState(next) {
      state.value = next || resetState();
      render();
      return state.value;
    }

    function reset() {
      state.value = resetState();
      render();
      return state.value;
    }

    get('advanced-filter-tags-search')?.addEventListener('input', renderTags);
    for (const role of ['author', 'artist']) {
      const control = peopleControls[role];
      get(control.input)?.addEventListener('input', () => renderPeople(role));
    }

    return {
      getState: () => state.value,
      setState,
      reset,
      getQueryState: () => serializeState(state.value),
      render,
      close: () => {
        for (const role of ['author', 'artist']) {
          const control = peopleControls[role];
          const results = get(control.results);
          const input = get(control.input);
          if (results) results.hidden = true;
          input?.setAttribute('aria-expanded', 'false');
        }
      }
    };
  }

  window.AdvancedSearchFilterUtils = {
    cycleTagState,
    emptyState,
    serializeState,
    resetState,
    peopleForRole,
    filterOptions,
    parseQueryState
  };
  window.AdvancedSearchFilters = { create };
})();
