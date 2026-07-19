// Rating state
let ratingData = { average: 0, count: 0 };
let userRating = 0;
let isRatingLoaded = false;
const ratingLabels = {
  10: 'Masterpiece',
  9: 'Great',
  8: 'Very Good',
  7: 'Good',
  6: 'Fine',
  5: 'Average',
  4: 'Bad',
  3: 'Very Bad',
  2: 'Horrible',
  1: 'Appalling'
};

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSession();
  initRating();
});

function initRating() {
  document.getElementById('rating-login-btn')?.addEventListener('click', () => {
    openAuthModal('login');
  });
  initRatingMenu();

  if (activeMangaId) {
    loadRatings();
    return;
  }

  const waitForManga = setInterval(() => {
    if (!activeMangaId) return;
    clearInterval(waitForManga);
    loadRatings();
  }, 50);
  setTimeout(() => clearInterval(waitForManga), 3000);
}

function positionRatingMenu(button, menu) {
  const rect = button.getBoundingClientRect();
  const viewportPadding = 12;
  const gap = 6;
  const headerBottom = document.getElementById('global-header')?.getBoundingClientRect().bottom || 0;
  const viewportTop = Math.max(viewportPadding, headerBottom + gap);
  const desiredHeight = Math.min(menu.scrollHeight, 360);
  const availableBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
  const availableAbove = rect.top - gap - viewportTop;
  const openUpward = availableBelow < desiredHeight && availableAbove > availableBelow;
  const availableHeight = Math.max(80, openUpward ? availableAbove : availableBelow);
  const maxHeight = Math.min(360, availableHeight);
  const width = Math.max(210, rect.width);
  const maximumLeft = Math.max(viewportPadding, window.innerWidth - width - viewportPadding);
  const left = Math.min(Math.max(rect.left, viewportPadding), maximumLeft);

  menu.style.position = 'fixed';
  menu.style.left = `${left}px`;
  menu.style.right = 'auto';
  menu.style.width = `${width}px`;
  menu.style.maxHeight = `${maxHeight}px`;
  menu.style.top = openUpward
    ? `${Math.max(viewportTop, rect.top - gap - Math.min(menu.scrollHeight, maxHeight))}px`
    : `${rect.bottom + gap}px`;
}

function initRatingMenu() {
  const button = document.getElementById('rating-menu-btn');
  const menu = document.getElementById('rating-score-menu');
  if (!button || !menu) return;

  menu.innerHTML = Object.entries(ratingLabels)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([score, label]) => `
      <button type="button" class="rating-score-option" data-score="${score}">
        <span>(${score})</span> ${label}
      </button>
    `).join('');

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (menu.style.display === 'flex') {
      menu.style.display = 'none';
      return;
    }
    menu.style.display = 'flex';
    positionRatingMenu(button, menu);
  });

  menu.querySelectorAll('.rating-score-option').forEach(option => {
    option.addEventListener('click', async (e) => {
      e.stopPropagation();
      menu.style.display = 'none';
      await submitRating(Number(option.dataset.score));
    });
  });

  document.addEventListener('click', () => {
    menu.style.display = 'none';
  });

  window.addEventListener('resize', () => {
    if (menu.style.display === 'flex') positionRatingMenu(button, menu);
  });
  window.addEventListener('scroll', () => {
    if (menu.style.display === 'flex') positionRatingMenu(button, menu);
  });
}

async function loadRatings() {
  if (!activeMangaId) return;

  try {
    const res = await apiFetch(`${API_BASE}/ratings?mangaId=${activeMangaId}`);
    if (res.ok) {
      const data = await res.json();
      ratingData = data;
      renderRatingStars();
      updateRatingSummary();

      // Load user rating if logged in
      if (currentUser) {
        loadUserRating();
      } else {
        updateRatingUI();
      }

      isRatingLoaded = true;
    }
  } catch (e) {
    console.error('Error loading ratings:', e);
  }
}

async function loadUserRating() {
  if (!currentUser || !activeMangaId) return;

  try {
    const res = await apiFetch(`${API_BASE}/ratings/my?mangaId=${activeMangaId}`);
    if (res.ok) {
      const data = await res.json();
      userRating = data.score || 0;
      renderUserRatingStars();
      updateRatingMenuLabel();
      updateRatingUI();
    }
  } catch (e) {
    console.error('Error loading user rating:', e);
  }
}

function renderRatingStars() {
  const container = document.getElementById('rating-stars-container');
  if (!container) return;
  const average = ratingData.average || 0;

  // Render 10 stars (half-star representation)
  let html = '';
  for (let i = 1; i <= 10; i++) {
    const filled = i <= Math.round(average);
    html += `<span class="rating-star ${filled ? 'filled' : 'empty'}" style="color: ${filled ? '#FF8C00' : 'var(--border-subtle)'};">★</span>`;
  }
  container.innerHTML = html;

  const averageEl = document.getElementById('rating-average');
  const countEl = document.getElementById('rating-count');
  if (averageEl) averageEl.textContent = average.toFixed(1);
  if (countEl) countEl.textContent = `(${ratingData.count})`;
}

function updateRatingSummary() {
  const average = ratingData.average || 0;
  const detailAverage = document.getElementById('detail-rating-average');
  const detailCount = document.getElementById('detail-rating-count');
  const detailCommentCount = mangaDetail?.commentCount ?? 0;
  if (detailAverage) detailAverage.textContent = average > 0 ? average.toFixed(2) : '-';
  if (detailCount) detailCount.textContent = detailCommentCount;
}

function renderUserRatingStars() {
  const container = document.getElementById('rating-user-stars');
  if (!container) return;
  container.innerHTML = '';

  // Render interactive 10 stars
  for (let i = 1; i <= 10; i++) {
    const star = document.createElement('span');
    star.className = 'rating-star interactive';
    star.style.color = i <= userRating ? '#FF8C00' : 'var(--border-subtle)';
    star.style.cursor = 'pointer';
    star.style.fontSize = '1.2rem';
    star.style.transition = 'color 0.15s';
    star.textContent = '★';
    star.dataset.score = i;

    star.addEventListener('mouseenter', () => {
      star.style.color = '#FF8C00';
      // Highlight all previous stars
      for (let j = 1; j < i; j++) {
        container.children[j - 1].style.color = '#FF8C00';
      }
    });

    star.addEventListener('mouseleave', () => {
      // Reset to user rating
      Array.from(container.children).forEach((s, idx) => {
        s.style.color = idx < userRating ? '#FF8C00' : 'var(--border-subtle)';
      });
    });

    star.addEventListener('click', () => {
      submitRating(i);
    });

    container.appendChild(star);
  }
}

function updateRatingMenuLabel() {
  const label = document.getElementById('rating-menu-label');
  const button = document.getElementById('rating-menu-btn');
  button?.classList.toggle('rated', userRating > 0);
  if (!label) return;
  label.textContent = userRating > 0
    ? `(${userRating}) ${ratingLabels[userRating] || t('rating.title', 'Đánh giá')}`
    : t('rating.title', 'Đánh giá');
}

async function submitRating(score) {
  if (!currentUser) {
    openAuthModal('login');
    return;
  }

  if (!activeMangaId) return;

  try {
    const res = await apiFetch(`${API_BASE}/ratings`, {
      method: 'POST',
      body: JSON.stringify({
        mangaId: activeMangaId,
        score: score
      })
    });

    if (res.ok) {
      const data = await res.json();
      userRating = data.score;
      renderUserRatingStars();
      updateRatingMenuLabel();
      await loadRatings();
    } else {
      const error = await res.json().catch(() => ({}));
      showToast(error.message || t('rating.submitError', 'Không thể đánh giá.'), 'error');
    }
  } catch (e) {
    console.error('Error submitting rating:', e);
    showToast(t('rating.submitError', 'Lỗi kết nối máy chủ.'), 'error');
  }
}

function updateRatingUI() {
  const userSection = document.getElementById('rating-user-section');
  const loginPrompt = document.getElementById('rating-login-prompt');
  if (!currentUser) userRating = 0;
  updateRatingMenuLabel();
  if (!userSection || !loginPrompt) return;

  if (currentUser) {
    userSection.style.display = 'block';
    loginPrompt.style.display = 'none';
  } else {
    userSection.style.display = 'none';
    loginPrompt.style.display = 'block';
  }
}

function onDetailRatingLocaleChanged() {
  renderRatingStars();
  updateRatingSummary();
  updateRatingMenuLabel();
  updateRatingUI();
}

window.addEventListener('manganpk:localechanged', onDetailRatingLocaleChanged);

// Update rating UI when user logs in/out
const originalRenderHeaderUserAreaForRating = renderHeaderUserArea;
if (typeof originalRenderHeaderUserAreaForRating === 'function') {
  window.renderHeaderUserArea = function() {
    originalRenderHeaderUserAreaForRating();
    updateRatingUI();
    if (currentUser && isRatingLoaded) {
      loadUserRating();
    }
  };
}
