(() => {
  const list = document.getElementById('admin-reports-list');
  if (!list) return;

  let adminReportPage = 1;
  let totalPages = 1;
  let lastItems = [];
  let pagination = document.getElementById('admin-reports-pagination');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  if (!pagination) {
    pagination = document.createElement('div');
    pagination.id = 'admin-reports-pagination';
    pagination.className = 'admin-catalog-pagination';
    list.insertAdjacentElement('afterend', pagination);
  }

  function render() {
    list.innerHTML = lastItems.length
      ? lastItems.map(report => `<article class="glass-card" style="padding:16px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;gap:12px">
            <strong>${esc(report.targetType === 'Chapter'
              ? report.chapterTitle || `Chapter #${report.chapterId}`
              : report.mangaTitle || `Manga #${report.mangaId}`)}</strong>
            <span>${esc(report.status)}</span>
          </div>
          <p style="margin:8px 0">${esc(report.reason)}</p>
          ${report.explanation ? `<small>${esc(report.explanation)}</small>` : ''}
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
            <small>${t('admin.reportedBy', 'Bởi')} ${esc(report.reporter)}</small>
            ${report.status === 'Pending' ? `<span>
              <button data-report-action="Resolved" data-report-id="${report.id}">${t('admin.resolve', 'Đã xử lý')}</button>
              <button data-report-action="Dismissed" data-report-id="${report.id}">${t('admin.dismiss', 'Bỏ qua')}</button>
            </span>` : ''}
          </div>
        </article>`).join('')
      : `<p>${t('admin.noReports', 'Chưa có báo cáo.')}</p>`;

    renderPagination();
    list.querySelectorAll('[data-report-action]').forEach(button => {
      button.onclick = async () => {
        const result = await apiFetch(`/api/reports/${button.dataset.reportId}`, {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: button.dataset.reportAction })
        });
        if (result.ok) load();
      };
    });
  }

  function renderPagination() {
    if (totalPages <= 1) {
      pagination.innerHTML = '';
      return;
    }
    const pages = [];
    for (let number = Math.max(1, adminReportPage - 2); number <= Math.min(totalPages, adminReportPage + 2); number += 1) {
      pages.push(number);
    }
    pagination.innerHTML = `<button data-page="${adminReportPage - 1}" ${adminReportPage === 1 ? 'disabled' : ''}>‹</button>
      ${pages.map(number => `<button data-page="${number}" class="${number === adminReportPage ? 'active' : ''}">${number}</button>`).join('')}
      <button data-page="${adminReportPage + 1}" ${adminReportPage === totalPages ? 'disabled' : ''}>›</button>`;
    pagination.querySelectorAll('[data-page]').forEach(button => {
      button.onclick = () => {
        const nextPage = Number(button.dataset.page);
        if (nextPage >= 1 && nextPage <= totalPages && nextPage !== adminReportPage) {
          adminReportPage = nextPage;
          load();
        }
      };
    });
  }

  async function load() {
    list.textContent = t('admin.loadingReports', 'Đang tải báo cáo...');
    const query = new URLSearchParams({ page: String(adminReportPage), pageSize: '20' });
    const status = document.getElementById('report-status-filter')?.value;
    const target = document.getElementById('report-target-filter')?.value;
    if (status) query.set('status', status);
    if (target) query.set('targetType', target);

    try {
      const response = await apiFetch(`/api/reports?${query}`);
      if (!response.ok) {
        list.textContent = t('admin.loadReportsError', 'Không thể tải báo cáo.');
        return;
      }
      const data = await response.json();
      lastItems = data.items || [];
      adminReportPage = data.page || 1;
      totalPages = data.totalPages || 1;
      render();
    } catch {
      list.textContent = t('admin.connectionError', 'Lỗi kết nối.');
    }
  }

  function refreshLocale() {
    render();
  }

  document.getElementById('report-status-filter')?.addEventListener('change', () => {
    adminReportPage = 1;
    load();
  });
  document.getElementById('report-target-filter')?.addEventListener('change', () => {
    adminReportPage = 1;
    load();
  });

  window.AdminReports = { refreshLocale, load };
  load();
})();
