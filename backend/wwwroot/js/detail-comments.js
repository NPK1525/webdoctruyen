// Comments state
let comments = [];
let isCommentsLoaded = false;

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSession();
  initComments();
});

function initComments() {
  // Comment form submit
  const submitBtn = document.getElementById('btn-submit-comment');
  const commentInput = document.getElementById('comment-input');

  if (submitBtn && commentInput) {
    submitBtn.addEventListener('click', handleSubmitComment);

    // Ctrl+Enter to submit
    commentInput.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        handleSubmitComment();
      }
    });
  }

  // Login prompt button
  document.getElementById('comment-login-btn')?.addEventListener('click', () => {
    openAuthModal('login');
  });

  // Load comments when comments tab is activated
  const commentsTab = document.querySelector('.tab[data-tab="comments"]');
  if (commentsTab) {
    commentsTab.addEventListener('click', () => {
      if (!isCommentsLoaded) {
        loadComments();
      }
    });
  }

  updateCommentUI();
}

async function loadComments() {
  if (!activeMangaId) return;

  const loading = document.getElementById('comments-loading');
  const list = document.getElementById('comments-list');
  const empty = document.getElementById('comments-empty');
  if (!loading || !list || !empty) return;

  loading.style.display = 'flex';
  list.style.display = 'none';
  empty.style.display = 'none';

  try {
    const res = await apiFetch(`${API_BASE}/comments?mangaId=${activeMangaId}`);
    if (res.ok) {
      const data = await res.json();
      comments = data.comments || [];
      renderComments();
      isCommentsLoaded = true;
    }
  } catch (e) {
    console.error('Error loading comments:', e);
  } finally {
    loading.style.display = 'none';
  }
}

function renderComments() {
  const list = document.getElementById('comments-list');
  const empty = document.getElementById('comments-empty');

  if (comments.length === 0) {
    list.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  list.style.display = 'flex';
  empty.style.display = 'none';

  list.innerHTML = comments.map(comment => renderCommentItem(comment)).join('');
  bindCommentEvents();

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderCommentItem(comment) {
  const isOwnComment = currentUser && comment.userId === currentUser.id;
  const isAdmin = currentUser && currentUser.role === 'Admin';
  const canEdit = isOwnComment || isAdmin;
  const canDelete = isOwnComment || isAdmin;

  const dateStr = new Date(comment.createdAt).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <div class="glass-card comment-item" data-comment-id="${comment.id}" style="padding: 16px; border-radius: var(--radius-md);">
      <div style="display: flex; gap: 12px;">
        <!-- Avatar -->
        <div style="width: 40px; height: 40px; border-radius: 50%; background-color: var(--bg-input); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i data-lucide="user" style="width: 20px; height: 20px; color: var(--text-muted);"></i>
        </div>

        <!-- Content -->
        <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <span style="font-weight: 700; color: var(--text-bright); font-size: 0.9rem;">${escapeHtml(comment.username)}</span>
              <span style="color: var(--text-muted); font-size: 0.75rem; margin-left: 8px;">${dateStr}</span>
            </div>

            <!-- Actions -->
            ${canEdit || canDelete ? `
              <div class="comment-actions" style="display: flex; gap: 8px;">
                ${canEdit ? `
                  <button class="btn-edit-comment" data-comment-id="${comment.id}" style="background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px;" title="${t('comments.edit', 'Sửa')}">
                    <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                  </button>
                ` : ''}
                ${canDelete ? `
                  <button class="btn-delete-comment" data-comment-id="${comment.id}" style="background: none; border: none; cursor: pointer; color: var(--accent-primary); padding: 4px;" title="${t('comments.delete', 'Xóa')}">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                  </button>
                ` : ''}
              </div>
            ` : ''}
          </div>

          <div class="comment-content" style="color: var(--text-main); font-size: 0.9rem; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(comment.content)}</div>

          <!-- Edit form (hidden by default) -->
          <div class="comment-edit-form" style="display: none; margin-top: 8px;">
            <textarea class="form-control comment-edit-input" rows="3" style="resize: vertical; min-height: 60px;">${escapeHtml(comment.content)}</textarea>
            <div style="display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end;">
              <button class="btn-cancel-edit" style="padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; background: var(--bg-input); border: 1px solid var(--border-subtle); color: var(--text-main); cursor: pointer;">${t('comments.cancel', 'Hủy')}</button>
              <button class="btn-save-edit" style="padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; background: var(--accent-primary); border: none; color: white; cursor: pointer; font-weight: 600;">${t('comments.save', 'Lưu')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function bindCommentEvents() {
  // Edit buttons
  document.querySelectorAll('.btn-edit-comment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const commentId = Number(btn.dataset.commentId);
      showEditForm(commentId);
    });
  });

  // Delete buttons
  document.querySelectorAll('.btn-delete-comment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const commentId = Number(btn.dataset.commentId);
      if (confirm(t('comments.confirmDelete', 'Bạn có chắc muốn xóa bình luận này?'))) {
        deleteComment(commentId);
      }
    });
  });

  // Cancel edit
  document.querySelectorAll('.btn-cancel-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const commentItem = btn.closest('.comment-item');
      const editForm = commentItem.querySelector('.comment-edit-form');
      const content = commentItem.querySelector('.comment-content');
      editForm.style.display = 'none';
      content.style.display = 'block';
    });
  });

  // Save edit
  document.querySelectorAll('.btn-save-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const commentItem = btn.closest('.comment-item');
      const commentId = Number(commentItem.dataset.commentId);
      const input = commentItem.querySelector('.comment-edit-input');
      const newContent = input.value.trim();

      if (newContent) {
        updateComment(commentId, newContent);
      }
    });
  });
}

function showEditForm(commentId) {
  const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
  if (!commentItem) return;

  const editForm = commentItem.querySelector('.comment-edit-form');
  const content = commentItem.querySelector('.comment-content');

  editForm.style.display = 'block';
  content.style.display = 'none';
}

async function handleSubmitComment() {
  if (!currentUser) {
    openAuthModal('login');
    return;
  }

  if (!activeMangaId) return;

  const input = document.getElementById('comment-input');
  const content = input.value.trim();

  if (!content) {
    showToast(t('comments.emptyContent', 'Nội dung bình luận không được trống.'), 'warning');
    return;
  }

  const submitBtn = document.getElementById('btn-submit-comment');
  submitBtn.disabled = true;

  try {
    const res = await apiFetch(`${API_BASE}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        mangaId: activeMangaId,
        content: content
      })
    });

    if (res.ok) {
      const newComment = await res.json();
      comments.unshift(newComment);
      renderComments();
      input.value = '';
      document.getElementById('comments-empty').style.display = 'none';
    } else {
      const error = await res.json().catch(() => ({}));
      showToast(error.message || t('comments.submitError', 'Không thể gửi bình luận.'), 'error');
    }
  } catch (e) {
    console.error('Error submitting comment:', e);
    showToast(t('comments.submitError', 'Lỗi kết nối máy chủ.'), 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

async function updateComment(commentId, newContent) {
  try {
    const res = await apiFetch(`${API_BASE}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content: newContent })
    });

    if (res.ok) {
      const updated = await res.json();
      const idx = comments.findIndex(c => c.id === commentId);
      if (idx !== -1) {
        comments[idx] = updated;
        renderComments();
      }
    } else {
      const error = await res.json().catch(() => ({}));
      showToast(error.message || t('comments.updateError', 'Không thể cập nhật bình luận.'), 'error');
    }
  } catch (e) {
    console.error('Error updating comment:', e);
    showToast(t('comments.updateError', 'Lỗi kết nối máy chủ.'), 'error');
  }
}

async function deleteComment(commentId) {
  try {
    const res = await apiFetch(`${API_BASE}/comments/${commentId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      comments = comments.filter(c => c.id !== commentId);
      renderComments();
    } else {
      const error = await res.json().catch(() => ({}));
      showToast(error.message || t('comments.deleteError', 'Không thể xóa bình luận.'), 'error');
    }
  } catch (e) {
    console.error('Error deleting comment:', e);
    showToast(t('comments.deleteError', 'Lỗi kết nối máy chủ.'), 'error');
  }
}

function updateCommentUI() {
  const formContainer = document.getElementById('comment-form-container');
  const loginPrompt = document.getElementById('comment-login-prompt');
  if (!formContainer || !loginPrompt) return;

  if (currentUser) {
    formContainer.style.display = 'block';
    loginPrompt.style.display = 'none';
  } else {
    formContainer.style.display = 'none';
    loginPrompt.style.display = 'block';
  }
}

function onDetailCommentsLocaleChanged() {
  renderComments();
  updateCommentUI();
}

window.addEventListener('manganpk:localechanged', onDetailCommentsLocaleChanged);

// Update UI when user logs in/out
const originalRenderHeaderUserAreaForComments = renderHeaderUserArea;
if (typeof originalRenderHeaderUserAreaForComments === 'function') {
  window.renderHeaderUserArea = function() {
    originalRenderHeaderUserAreaForComments();
    updateCommentUI();
  };
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
