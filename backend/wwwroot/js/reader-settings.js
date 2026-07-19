// Reader settings modal, persisted preferences, and input bindings.

function initReaderSettingsModal() {
  document.getElementById('reader-settings-close')?.addEventListener('click', closeReaderSettingsModal);
  document.querySelector('#reader-settings-modal .reader-settings-backdrop')?.addEventListener('click', closeReaderSettingsModal);

  document.querySelectorAll('[data-reader-settings-tab]').forEach(btn => {
    btn.addEventListener('click', () => openReaderSettingsModal(btn.dataset.readerSettingsTab));
  });
  document.querySelectorAll('[data-reader-display]').forEach(btn => {
    btn.addEventListener('click', () => setReaderDisplayStyle(btn.dataset.readerDisplay));
  });
  document.querySelectorAll('[data-reader-direction]').forEach(btn => {
    btn.addEventListener('click', () => setReaderDirection(btn.dataset.readerDirection));
  });
  document.querySelectorAll('[data-reader-header]').forEach(btn => {
    btn.addEventListener('click', () => setReaderHeaderHidden(btn.dataset.readerHeader === 'hidden'));
  });
  document.querySelectorAll('[data-reader-progress]').forEach(btn => {
    btn.addEventListener('click', () => setProgressMode(btn.dataset.readerProgress));
  });
  document.querySelectorAll('[data-reader-background]').forEach(btn => {
    btn.addEventListener('click', () => setReaderBackground(btn.dataset.readerBackground));
  });
  document.querySelectorAll('[data-reader-fit-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const option = btn.dataset.readerFitToggle;
      if (option === 'width') setReaderFitMode(fitMode === 'width' ? 'none' : (fitMode === 'height' ? 'both' : 'width'));
      else if (option === 'height') setReaderFitMode(fitMode === 'height' ? 'none' : (fitMode === 'width' ? 'both' : 'height'));
      else if (option === 'none') setReaderFitMode('none');
      else if (option === 'limit-width') { limitReaderWidth = !limitReaderWidth; localStorage.setItem('reader_limit_width', String(limitReaderWidth)); renderReader(); syncReaderSettingsUI(); }
      else if (option === 'limit-height') { limitReaderHeight = !limitReaderHeight; localStorage.setItem('reader_limit_height', String(limitReaderHeight)); renderReader(); syncReaderSettingsUI(); }
    });
  });
  document.querySelectorAll('[data-reader-auto-advance]').forEach(btn => {
    btn.addEventListener('click', () => {
      autoAdvanceLastPage = btn.dataset.readerAutoAdvance === 'true';
      localStorage.setItem('reader_auto_advance', String(autoAdvanceLastPage));
      syncReaderSettingsUI();
    });
  });
  document.querySelectorAll('[data-reader-tap-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      tapMode = btn.dataset.readerTapMode;
      localStorage.setItem('reader_tap_mode', tapMode);
      syncReaderSettingsUI();
    });
  });
  document.querySelectorAll('[data-reader-scroll-turn]').forEach(btn => {
    btn.addEventListener('click', () => {
      scrollTurnMode = btn.dataset.readerScrollTurn;
      localStorage.setItem('reader_scroll_turn', scrollTurnMode);
      syncReaderSettingsUI();
    });
  });
  document.querySelectorAll('[data-reader-double-fullscreen]').forEach(btn => {
    btn.addEventListener('click', () => {
      doubleClickFullscreen = btn.dataset.readerDoubleFullscreen === 'true';
      localStorage.setItem('reader_double_fullscreen', String(doubleClickFullscreen));
      syncReaderSettingsUI();
    });
  });
  document.getElementById('reader-reset-keybinds')?.addEventListener('click', () => {
    readerKeybinds = structuredClone(defaultReaderKeybinds);
    localStorage.removeItem('reader_keybinds');
    renderReaderKeybinds();
  });

  renderReaderKeybinds();
  syncReaderSettingsUI();
}

function openReaderSettingsModal(tab = 'layout') {
  const modal = document.getElementById('reader-settings-modal');
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.querySelectorAll('[data-reader-settings-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.readerSettingsTab === tab);
  });
  document.querySelectorAll('[data-reader-settings-panel]').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.readerSettingsPanel === tab);
  });
  syncReaderSettingsUI();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeReaderSettingsModal() {
  const modal = document.getElementById('reader-settings-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function syncReaderSettingsUI() {
  document.querySelectorAll('[data-reader-display]').forEach(btn => btn.classList.toggle('active', btn.dataset.readerDisplay === readerDisplayStyle));
  document.querySelectorAll('[data-reader-direction]').forEach(btn => btn.classList.toggle('active', btn.dataset.readerDirection === readerDirection));
  document.querySelectorAll('[data-reader-header]').forEach(btn => btn.classList.toggle('active', (btn.dataset.readerHeader === 'hidden') === readerHeaderHidden));
  document.querySelectorAll('[data-reader-progress]').forEach(btn => btn.classList.toggle('active', btn.dataset.readerProgress === progressMode));
  document.querySelectorAll('[data-reader-background]').forEach(btn => btn.classList.toggle('active', btn.dataset.readerBackground === readerBackground));
  document.querySelectorAll('[data-reader-auto-advance]').forEach(btn => btn.classList.toggle('active', (btn.dataset.readerAutoAdvance === 'true') === autoAdvanceLastPage));
  document.querySelectorAll('[data-reader-tap-mode]').forEach(btn => btn.classList.toggle('active', btn.dataset.readerTapMode === tapMode));
  document.querySelectorAll('[data-reader-scroll-turn]').forEach(btn => btn.classList.toggle('active', btn.dataset.readerScrollTurn === scrollTurnMode));
  document.querySelectorAll('[data-reader-double-fullscreen]').forEach(btn => btn.classList.toggle('active', (btn.dataset.readerDoubleFullscreen === 'true') === doubleClickFullscreen));
  document.querySelectorAll('[data-reader-fit-toggle]').forEach(btn => {
    const option = btn.dataset.readerFitToggle;
    const active = (option === 'width' && (fitMode === 'width' || fitMode === 'both'))
      || (option === 'height' && (fitMode === 'height' || fitMode === 'both'))
      || (option === 'none' && fitMode === 'none')
      || (option === 'limit-width' && limitReaderWidth)
      || (option === 'limit-height' && limitReaderHeight);
    btn.classList.toggle('active', active);
  });
}

function renderReaderKeybinds() {
  const list = document.getElementById('reader-keybind-list');
  if (!list) return;
  const labels = {
    toggleMenu: 'Toggle menu',
    pageRight: 'Turn page right',
    pageLeft: 'Turn page left',
    scrollUp: 'Scroll up',
    scrollDown: 'Scroll down',
    chapterForward: 'Chapter forward',
    chapterBackward: 'Chapter backward',
    immersive: 'Toggle immersive mode',
    cycleFit: 'Cycle image fit mode'
  };
  list.innerHTML = Object.entries(labels).map(([action, label]) => `
    <div class="reader-keybind-row">
      <span>${label}</span>
      <div>${(readerKeybinds[action] || []).map(code => `<kbd>${formatKeybind(code)}</kbd>`).join('')}</div>
    </div>
  `).join('');
}

function loadReaderKeybinds() {
  try {
    return { ...structuredClone(defaultReaderKeybinds), ...JSON.parse(localStorage.getItem('reader_keybinds') || '{}') };
  } catch {
    return structuredClone(defaultReaderKeybinds);
  }
}

function formatKeybind(code) {
  return code.replace('Key', '').replace('Arrow', '').replace('Numpad', 'Num ').replace('Period', '.').replace('Comma', ',');
}

function initReaderKeybinds() {
  document.addEventListener('keydown', handleReaderKeydown);
  document.getElementById('reader-viewer-pane')?.addEventListener('dblclick', () => {
    if (doubleClickFullscreen) toggleFullscreen();
  });
  document.getElementById('reader-viewer-pane')?.addEventListener('wheel', handleReaderWheel, { passive: false });
}

function isTypingTarget(target) {
  return !!target?.closest?.('input, textarea, select, [contenteditable="true"]');
}

function keyMatches(action, e) {
  return (readerKeybinds[action] || []).includes(e.code);
}

function handleReaderKeydown(e) {
  if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (keyMatches('toggleMenu', e)) { e.preventDefault(); document.body.classList.contains('reader-drawer-open') ? closeReaderDrawer() : openReaderDrawer(); }
  else if (keyMatches('pageRight', e)) { e.preventDefault(); turnPageByDirection('right'); }
  else if (keyMatches('pageLeft', e)) { e.preventDefault(); turnPageByDirection('left'); }
  else if (keyMatches('scrollUp', e) && (scrollTurnMode === 'keyboard' || scrollTurnMode === 'both')) { e.preventDefault(); window.scrollBy({ top: -Math.round(window.innerHeight * 0.75), behavior: 'smooth' }); }
  else if (keyMatches('scrollDown', e) && (scrollTurnMode === 'keyboard' || scrollTurnMode === 'both')) { e.preventDefault(); window.scrollBy({ top: Math.round(window.innerHeight * 0.75), behavior: 'smooth' }); }
  else if (keyMatches('chapterForward', e)) { e.preventDefault(); goToNextChapter(); }
  else if (keyMatches('chapterBackward', e)) { e.preventDefault(); goToPreviousChapter(); }
  else if (keyMatches('immersive', e)) { e.preventDefault(); setReaderHeaderHidden(!readerHeaderHidden); }
  else if (keyMatches('cycleFit', e)) { e.preventDefault(); cycleReaderFitMode(); }
}

function handleReaderWheel(e) {
  if (scrollTurnMode !== 'mouse' && scrollTurnMode !== 'both') return;
  if (readingMode !== 'slide') return;
  const now = Date.now();
  if (now - lastWheelTurnAt < 450) return;
  lastWheelTurnAt = now;
  e.preventDefault();
  turnPageByDirection(e.deltaY > 0 ? 'right' : 'left');
}
