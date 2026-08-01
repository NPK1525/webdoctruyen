(function () {
  const root = document.getElementById('my-reports-list');
  const pagination = document.querySelector('.my-reports-pagination');
  const [prevButton, nextButton] = pagination ? pagination.querySelectorAll('button') : [];
  const pageSize = 20;
  const reasons = [
    'Duplicate entry',
    'Incorrect or missing volume numbers',
    'Information to correct',
    'Missing cover art',
    'Other',
    'Troll entry',
    'Vandalism',
    'Credit page in the middle of the chapter',
    'Duplicate upload from same user/group',
    'Images not loading',
    'Incorrect chapter number',
    'Incorrect or duplicate pages',
    'Missing pages'
  ];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  const reasonSelect = document.getElementById('my-report-reason');
  [...new Set(reasons)].forEach(reason => {
    reasonSelect.insertAdjacentHTML('beforeend', `<option value="${esc(reason)}">${esc(reason)}</option>`);
  });

  let reports = [];
  let currentPage = 1;
  let totalPages = 1;

  function currentFilters() {
    return {
      objectId: document.getElementById('my-report-object').value.trim(),
      category: document.getElementById('my-report-category').value,
      reason: reasonSelect.value,
      status: document.getElementById('my-report-status').value
    };
  }

  function normalizeCategory(category) {
    if (!category) return '';
    if (category === 'Title') return 'Manga';
    return category;
  }

  function buildQuery(page) {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const filters = currentFilters();
    if (filters.objectId) query.set('objectId', filters.objectId);
    if (filters.category) query.set('category', normalizeCategory(filters.category));
    if (filters.reason) query.set('reason', filters.reason);
    if (filters.status) query.set('status', filters.status);
    return query;
  }

  function render() {
    root.innerHTML = reports.length
      ? reports.map(report => `<article class="my-report-card"><div><strong>${esc(report.targetType === 'Chapter' ? report.chapterTitle || `Chapter #${report.chapterId}` : report.mangaTitle || `Title #${report.mangaId}`)}</strong><p>${esc(report.reason)}</p></div><span class="my-report-status status-${esc(report.status).toLowerCase()}">${esc(report.status === 'Pending' ? 'Waiting' : report.status === 'Resolved' ? 'Accepted' : 'Refused')}</span></article>`).join('')
      : '<div class="my-reports-empty">No reports found</div>';

    if (prevButton) prevButton.disabled = currentPage <= 1;
    if (nextButton) nextButton.disabled = currentPage >= totalPages;

    let label = pagination?.querySelector('[data-my-report-page]');
    if (!label && pagination) {
      label = document.createElement('span');
      label.dataset.myReportPage = 'true';
      pagination.insertBefore(label, nextButton);
    }
    if (label) label.textContent = `${currentPage} / ${totalPages}`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  async function load(page = 1) {
    currentPage = page;
    root.textContent = 'Loading...';

    try {
      const response = await fetch(`/api/reports/my?${buildQuery(page)}`, { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Unable to load reports.');
      const data = await response.json();
      reports = data.items || [];
      currentPage = data.page || page;
      totalPages = data.totalPages || 1;
      render();
    } catch (error) {
      root.innerHTML = `<div class="my-reports-empty">${esc(error.message)}</div>`;
      if (prevButton) prevButton.disabled = true;
      if (nextButton) nextButton.disabled = true;
    }
  }

  document.getElementById('my-reports-filter').onclick = () => {
    load(1);
  };

  document.getElementById('my-reports-clear').onclick = () => {
    document.getElementById('my-report-object').value = '';
    document.getElementById('my-report-category').value = '';
    reasonSelect.value = '';
    document.getElementById('my-report-status').value = '';
    load(1);
  };

  prevButton?.addEventListener('click', () => {
    if (currentPage > 1) load(currentPage - 1);
  });

  nextButton?.addEventListener('click', () => {
    if (currentPage < totalPages) load(currentPage + 1);
  });

  document.querySelectorAll('[data-report-view]').forEach(button => button.onclick = () => {
    document.querySelectorAll('[data-report-view]').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    root.classList.toggle('grid-view', button.dataset.reportView === 'grid');
  });

  load(1);
})();
