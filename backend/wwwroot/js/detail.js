// Detail state variables
let activeMangaId = null;
let mangaDetail = null;
let recommendations = [];
let chapterSort = 'desc';
let activeTab = 'chapters';

// Demographic mapping
const demographicMap = { 0: 'Không có', 1: 'Shounen', 2: 'Shoujo', 3: 'Seinen', 4: 'Josei' };
const formatMap = { 0: 'Không có', 1: 'Adaptation', 2: 'WebComic', 3: 'OneShot', 4: 'Comic', 5: 'Book' };

document.addEventListener('DOMContentLoaded', async () => {
  // Try server-injected data first (MVC mode)
  if (window.__MANGA_DETAIL__) {
    mangaDetail = window.__MANGA_DETAIL__;
    recommendations = window.__RECOMMENDATIONS__ || [];
    activeMangaId = mangaDetail.id;
    initTabs();
    renderMangaDetails();
    renderRecommendations();
    return;
  }

  // Fallback: fetch from API (legacy HTML mode)
  const params = new URLSearchParams(window.location.search);
  const mId = params.get('mangaId');
  if (!mId) {
    alert("Không tìm thấy thông tin truyện!");
    window.location.href = '/';
    return;
  }
  activeMangaId = Number(mId);
  initTabs();
  await fetchMangaDetail();
  await fetchRecommendations();
});

// Fetch manga detail data (legacy)
async function fetchMangaDetail() {
  toggleDetailLoading(true);
  try {
    const res = await fetch(`${API_BASE}/manga/${activeMangaId}`);
    if (res.ok) {
      mangaDetail = await res.json();
      renderMangaDetails();
    } else {
      alert("Lỗi tải thông tin chi tiết truyện từ máy chủ.");
      window.location.href = '/';
    }
  } catch (e) {
    console.error("Error fetching manga details:", e);
  } finally {
    toggleDetailLoading(false);
  }
}

async function fetchRecommendations() {
  try {
    const res = await fetch(`${API_BASE}/manga/${activeMangaId}/recommendations?limit=6`);
    if (res.ok) {
      recommendations = await res.json();
      renderRecommendations();
    }
  } catch (e) {
    console.error("Error fetching recommendations:", e);
  }
}

function toggleDetailLoading(isLoading) {
  const spinner = document.getElementById('detail-loading-spinner');
  const mainContent = document.getElementById('detail-main-content');
  if (spinner && mainContent) {
    spinner.style.display = isLoading ? 'flex' : 'none';
    mainContent.style.display = isLoading ? 'none' : 'block';
  }
}

function getStatusText(status) {
  if (status === 'Ongoing' || status === 0) return 'Đang tiến hành';
  if (status === 'Completed' || status === 1) return 'Đã hoàn thành';
  return 'Tạm ngưng';
}

function getTypeBadgeClass(type) {
  if (type === 'Manga' || type === 0) return 'badge badge-manga';
  if (type === 'Manhwa' || type === 1) return 'badge badge-manhwa';
  return 'badge badge-manhua';
}

function getTypeLabel(type) {
  if (type === 'Manga' || type === 0) return 'Manga';
  if (type === 'Manhwa' || type === 1) return 'Manhwa';
  return 'Manhua';
}

function renderMangaDetails() {
  if (!mangaDetail) return;

  document.getElementById('manga-detail-title').textContent = mangaDetail.title;
  document.title = `${mangaDetail.title} - MangaNPK`;

  const bannerBg = document.getElementById('banner-bg-container');
  if (bannerBg) {
    bannerBg.innerHTML = `<img src="${mangaDetail.coverUrl}" class="banner-bg-img" alt="${mangaDetail.title}" /><div class="banner-bg-overlay"></div>`;
  }

  const coverContainer = document.getElementById('manga-detail-cover-container');
  if (coverContainer) {
    coverContainer.innerHTML = `<img src="${mangaDetail.coverUrl}" alt="${mangaDetail.title}" />`;
  }

  const typeContainer = document.getElementById('manga-type-badge-container');
  if (typeContainer) {
    typeContainer.innerHTML = `
      <span class="${getTypeBadgeClass(mangaDetail.type)}">${getTypeLabel(mangaDetail.type)}</span>
      <span class="badge" style="background-color: rgba(255,69,82,0.15); color: #FF4552; border: 1px solid rgba(255,69,82,0.3);">${getStatusText(mangaDetail.status)}</span>
    `;
  }

  const authorsText = mangaDetail.authors && mangaDetail.authors.length > 0
    ? mangaDetail.authors.map(a => `${a.name} (${a.role})`).join(', ')
    : 'Đang cập nhật';
  document.getElementById('manga-detail-authors').textContent = `Tác giả: ${authorsText}`;

  const descText = document.getElementById('manga-description-text');
  if (descText) descText.textContent = mangaDetail.description || 'Chưa có tóm tắt chi tiết.';

  const tagsContainer = document.getElementById('manga-genres-tags');
  if (tagsContainer) {
    tagsContainer.innerHTML = (mangaDetail.genres || []).map(g => `<span class="tag">${g.name}</span>`).join('');
  }

  document.getElementById('manga-status-val').textContent = getStatusText(mangaDetail.status);
  document.getElementById('manga-release-year-val').textContent = mangaDetail.releaseYear || 'N/A';
  document.getElementById('manga-created-date-val').textContent = mangaDetail.createdAt ? new Date(mangaDetail.createdAt).toLocaleDateString('vi-VN') : 'N/A';

  const demoBadge = document.getElementById('manga-demographic-badge');
  if (demoBadge) {
    const demoVal = typeof mangaDetail.demographic === 'number' ? mangaDetail.demographic : 0;
    demoBadge.innerHTML = `<span class="value-tag">${demographicMap[demoVal] || 'Không có'}</span>`;
  }

  const formatBadge = document.getElementById('manga-format-badge');
  if (formatBadge) {
    const formatVal = typeof mangaDetail.format === 'number' ? mangaDetail.format : 0;
    formatBadge.innerHTML = `<span class="value-tag">${formatMap[formatVal] || 'Không có'}</span>`;
  }

  const readFirstBtn = document.getElementById('btn-read-first-chapter');
  if (readFirstBtn) {
    readFirstBtn.onclick = () => {
      if (mangaDetail.chapters && mangaDetail.chapters.length > 0) {
        const sorted = [...mangaDetail.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
        window.location.href = `/chapter/${sorted[0].id}`;
      } else {
        alert("Truyện chưa có chương nào được tải lên!");
      }
    };
  }

  const bookmarkBtn = document.getElementById('btn-bookmark-manga');
  if (bookmarkBtn) {
    bookmarkBtn.onclick = () => alert(`Đã lưu "${mangaDetail.title}" vào tủ sách!`);
  }

  renderChaptersList();
}

function renderChaptersList() {
  if (!mangaDetail || !mangaDetail.chapters) return;

  const countLabel = document.getElementById('chapters-count-label');
  if (countLabel) countLabel.textContent = `Danh Sách Chương (${mangaDetail.chapters.length})`;

  const container = document.getElementById('chapters-list-container');
  if (!container) return;

  if (mangaDetail.chapters.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px 0;">Truyện chưa có chương nào.</p>`;
    return;
  }

  const sorted = [...mangaDetail.chapters].sort((a, b) =>
    chapterSort === 'desc' ? b.chapterNumber - a.chapterNumber : a.chapterNumber - b.chapterNumber
  );

  container.innerHTML = sorted.map(c => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background-color: #151A22; border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; transition: background-color 0.2s;" class="chapter-item-hover">
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <a href="/chapter/${c.id}" style="color: white; font-weight: 700; font-size: 0.95rem; text-decoration: none;">Chương ${c.chapterNumber}</a>
        ${c.title && c.title !== `Chương ${c.chapterNumber}` ? `<span style="font-size: 0.8rem; color: var(--text-muted);">${c.title}</span>` : ''}
      </div>
      <span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(c.uploadedAt).toLocaleDateString('vi-VN')}</span>
    </div>
  `).join('');

  const sortBtn = document.getElementById('btn-sort-chapters');
  if (sortBtn) {
    sortBtn.onclick = () => {
      chapterSort = chapterSort === 'desc' ? 'asc' : 'desc';
      sortBtn.innerHTML = `<i data-lucide="layers" style="width: 14px; height: 14px;"></i> ${chapterSort === 'desc' ? 'Mới nhất trước' : 'Cũ nhất trước'}`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      renderChaptersList();
    };
  }
}

function renderRecommendations() {
  const container = document.getElementById('recommendations-grid-container');
  if (!container) return;

  if (!recommendations || recommendations.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px 0;">Không có truyện gợi ý tương tự.</p>`;
    return;
  }

  container.innerHTML = recommendations.map(rec => `
    <div class="glass-card rec-card" style="display: flex; flex-direction: column; overflow: hidden; border-radius: var(--radius-md); padding: 0; background-color: #12151D;" data-manga-id="${rec.id}">
      <div style="height: 180px; overflow: hidden; position: relative;">
        <img src="${rec.coverUrl}" alt="${rec.title}" style="width: 100%; height: 100%; object-fit: cover;" />
        <div style="position: absolute; top: 8px; left: 8px;">
          <span class="${getTypeBadgeClass(rec.type)}" style="font-size: 0.65rem; padding: 2px 6px;">${getTypeLabel(rec.type)}</span>
        </div>
      </div>
      <div style="padding: 10px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
        <h4 style="font-size: 0.85rem; font-weight: 700; color: white; margin: 0 0 4px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.2;">${rec.title}</h4>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${rec.releaseYear || 'N/A'} • ${getStatusText(rec.status)}</span>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.rec-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const mId = e.currentTarget.dataset.mangaId;
      if (mId) window.location.href = `/manga/${mId}`;
    });
  });
}

function initTabs() {
  document.querySelectorAll('.detail-tabs .tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.detail-tabs .tab').forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      activeTab = e.currentTarget.dataset.tab;
      document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
      const pane = document.getElementById(`tab-content-${activeTab}`);
      if (pane) pane.style.display = 'block';
    });
  });
}
