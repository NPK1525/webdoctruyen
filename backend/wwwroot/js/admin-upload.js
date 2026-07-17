// Admin chapter and image upload handlers.

async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'same-origin'
  });
  if (!res.ok) throw new Error('Upload failed');
  return await res.json();
}

async function uploadMultipleFiles(files) {
  const formData = new FormData();
  for (const f of files) formData.append('files', f);
  const res = await fetch(`${API_BASE}/upload/multiple`, {
    method: 'POST',
    body: formData,
    credentials: 'same-origin'
  });
  if (!res.ok) throw new Error('Upload failed');
  return await res.json();
}

function initUploadHandlers() {
  initDraftImageUploadHandlers();

  // Cover upload
  const coverBtn = document.getElementById('btn-upload-cover');
  const coverInput = document.getElementById('manga-cover-file-input');
  const coverField = document.getElementById('manga-form-cover');
  const coverPreview = document.getElementById('manga-cover-preview');

  if (coverBtn && coverInput) {
    coverBtn.addEventListener('click', () => coverInput.click());
    coverInput.addEventListener('change', async () => {
      const file = coverInput.files?.[0];
      if (!file) return;
      try {
        coverBtn.disabled = true;
        coverBtn.textContent = t('upload.uploading', 'Đang tải...');
        const result = await uploadFile(file);
        coverField.value = result.url;
        if (coverPreview) {
          coverPreview.style.display = 'block';
          coverPreview.querySelector('img').src = result.url;
        }
        coverBtn.textContent = 'Done!';
        setTimeout(() => { coverBtn.textContent = t('admin.upload', 'Tải lên'); coverBtn.disabled = false; }, 1500);
      } catch (e) {
        showToast(t('upload.error', 'Tải lên thất bại.'), false);
        coverBtn.textContent = t('admin.upload', 'Tải lên');
        coverBtn.disabled = false;
      }
    });
  }

  // Chapter pages upload
  const pagesBtn = document.getElementById('btn-upload-pages');
  const pagesInput = document.getElementById('chapter-pages-file-input');
  const pagesPreview = document.getElementById('chapter-pages-preview');
  const pagesTextarea = document.getElementById('chapter-form-pages');

  if (pagesBtn && pagesInput) {
    pagesBtn.addEventListener('click', () => pagesInput.click());
    pagesInput.addEventListener('change', async () => {
      const files = pagesInput.files;
      if (!files || files.length === 0) return;
      try {
        pagesBtn.disabled = true;
        pagesBtn.textContent = t('upload.uploading', 'Đang tải...');
        const result = await uploadMultipleFiles(files);
        for (const item of result.files) {
          if (item.url) {
            uploadedChapterPages.push(item.url);
          }
        }
        renderChapterPagesPreview();
        pagesBtn.textContent = t('admin.uploadPagesText', 'Tải lên trang truyện');
        pagesBtn.disabled = false;
        pagesInput.value = '';
      } catch (e) {
        showToast(t('upload.error', 'Tải lên thất bại.'), false);
        pagesBtn.textContent = t('admin.uploadPagesText', 'Tải lên trang truyện');
        pagesBtn.disabled = false;
      }
    });
  }
}

function initDraftImageUploadHandlers() {
  const coverInput = document.getElementById('draft-cover-file-input');
  const bannerInput = document.getElementById('draft-banner-file-input');
  document.getElementById('btn-upload-draft-cover')?.addEventListener('click', () => coverInput?.click());
  document.getElementById('btn-upload-draft-banner')?.addEventListener('click', () => bannerInput?.click());

  coverInput?.addEventListener('change', async () => {
    const file = coverInput.files?.[0];
    if (!file) return;
    await uploadDraftImage(file, 'draft-cover-url');
    coverInput.value = '';
  });

  bannerInput?.addEventListener('change', async () => {
    const file = bannerInput.files?.[0];
    if (!file) return;
    await uploadDraftImage(file, 'draft-banner-url');
    bannerInput.value = '';
  });

  document.getElementById('draft-cover-url')?.addEventListener('input', renderDraftImagePreview);
  document.getElementById('draft-banner-url')?.addEventListener('input', renderDraftImagePreview);
}

async function uploadDraftImage(file, fieldId) {
  try {
    const result = await uploadFile(file);
    document.getElementById(fieldId).value = result.url;
    renderDraftImagePreview();
    showToast('\u0110\u00e3 \u0074\u1ea3\u0069 \u1ea3\u006e\u0068 \u006c\u00ea\u006e.', true);
  } catch (e) {
    console.error(e);
    showToast('\u0054\u1ea3\u0069 \u1ea3\u006e\u0068 \u0074\u0068\u1ea5\u0074 \u0062\u1ea1\u0069.', false);
  }
}

function renderDraftImagePreview() {
  const box = document.getElementById('draft-image-preview');
  if (!box) return;
  const cover = document.getElementById('draft-cover-url')?.value.trim();
  const banner = document.getElementById('draft-banner-url')?.value.trim();
  const items = [];
  if (cover) items.push(`<div><div style="color:var(--text-muted);font-size:0.78rem;margin-bottom:6px;">\u1ea2\u006e\u0068 \u0062\u00ec\u0061</div><img src="${escapeAdminHtml(cover)}" style="width:120px;height:170px;object-fit:cover;border-radius:6px;background:rgba(255,255,255,0.06);" /></div>`);
  if (banner) items.push(`<div style="flex:1;min-width:220px;"><div style="color:var(--text-muted);font-size:0.78rem;margin-bottom:6px;">Banner</div><img src="${escapeAdminHtml(banner)}" style="width:100%;max-width:420px;height:130px;object-fit:cover;border-radius:6px;background:rgba(255,255,255,0.06);" /></div>`);
  box.innerHTML = items.join('');
}

function renderChapterPagesPreview() {
  const container = document.getElementById('chapter-pages-preview');
  const textarea = document.getElementById('chapter-form-pages');
  if (!container) return;

  if (uploadedChapterPages.length === 0) {
    container.innerHTML = `<span style="color: var(--text-muted); font-size: 0.8rem; width: 100%; text-align: center; padding: 10px 0;">${t('admin.noPagesUploaded', 'Chưa tải lên trang nào.')}</span>`;
    if (textarea) textarea.value = '';
    return;
  }

  container.innerHTML = uploadedChapterPages.map((url, idx) => `
    <div class="page-preview-item" data-index="${idx}" draggable="${editingChapterSource === 'Local'}" style="position: relative; width: 80px; height: 110px; border-radius: 4px; overflow: hidden; border: 1px solid var(--border-subtle); cursor: ${editingChapterSource === 'Local' ? 'grab' : 'default'}; flex-shrink: 0;">
      <img src="${escapeAdminHtml(url)}" alt="Trang ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;" />
      <span style="position: absolute; bottom: 2px; left: 2px; font-size: 0.65rem; background: rgba(0,0,0,0.7); color: white; padding: 1px 5px; border-radius: 3px;">${idx + 1}</span>
      ${editingChapterSource === 'Local' ? `<button type="button" class="btn-remove-page" data-index="${idx}" style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(255,69,82,.9);color:white;border:none;font-size:.6rem;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;">×</button>` : ''}
    </div>
  `).join('');

  // Update textarea with URLs
  if (textarea) textarea.value = uploadedChapterPages.join('\n');

  container.querySelectorAll('img').forEach(image => {
    image.addEventListener('error', () => {
      image.src = '/img/chibi_mascot.png';
      image.alt = 'Ảnh lỗi - hãy xóa hoặc tải ảnh thay thế';
      image.closest('.page-preview-item').style.borderColor = '#FF4552';
      showToast('Phát hiện ảnh chapter bị lỗi. Hãy xóa ảnh đó và tải ảnh thay thế.', 'warning');
    }, { once: true });
  });

  // Remove page handler
  container.querySelectorAll('.btn-remove-page').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.index);
      uploadedChapterPages.splice(idx, 1);
      renderChapterPagesPreview();
    });
  });

  // Drag and drop reorder
  let dragItem = null;
  container.querySelectorAll('.page-preview-item').forEach(item => {
    if (editingChapterSource !== 'Local') return;
    item.addEventListener('dragstart', (e) => {
      dragItem = Number(e.currentTarget.dataset.index);
      e.currentTarget.style.opacity = '0.4';
    });
    item.addEventListener('dragend', (e) => {
      e.currentTarget.style.opacity = '1';
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetIdx = Number(e.currentTarget.dataset.index);
      if (dragItem === null || dragItem === targetIdx) return;
      const [moved] = uploadedChapterPages.splice(dragItem, 1);
      uploadedChapterPages.splice(targetIdx, 0, moved);
      dragItem = null;
      renderChapterPagesPreview();
    });
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}
