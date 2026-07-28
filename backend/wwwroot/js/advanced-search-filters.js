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
    const accepted = role === 'artist' ? ['Art', 'Story & Art'] : ['Story', 'Story & Art'];
    return (Array.isArray(people) ? people : []).filter(person => {
      const roles = Array.isArray(person.roles) ? person.roles : [];
      return roles.some(item => accepted.includes(item));
    });
  }

  function filterOptions(options, search) {
    const query = String(search || '').trim().toLocaleLowerCase();
    return (Array.isArray(options) ? options : [])
      .filter(option => !query || String(option.name || '').toLocaleLowerCase().includes(query))
      .slice(0, 8);
  }

  function create(options = {}) {
    let state = resetState();
    return {
      getState: () => state,
      setState: next => { state = next || resetState(); return state; },
      reset: () => { state = resetState(); return state; },
      getQueryState: () => serializeState(state),
      render: () => {}
    };
  }

  window.AdvancedSearchFilterUtils = {
    cycleTagState,
    emptyState,
    serializeState,
    resetState,
    peopleForRole,
    filterOptions
  };
  window.AdvancedSearchFilters = { create };
})();
