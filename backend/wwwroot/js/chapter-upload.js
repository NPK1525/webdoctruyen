(() => {
  'use strict';

  const form = document.getElementById('chapter-upload-form');
  const input = document.getElementById('chapter-page-files');
  const chooseButton = document.getElementById('chapter-choose-files');
  const dropZone = document.getElementById('chapter-drop-zone');
  const preview = document.getElementById('chapter-pages-preview');
  const pageCount = document.getElementById('chapter-page-count');
  const message = document.getElementById('chapter-upload-message');
  const urlInput = document.getElementById('chapter-page-urls');
  const submitButton = document.getElementById('chapter-submit');

  if (!form || !input || !dropZone || !preview) return;

  const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const maxFileSize = 15 * 1024 * 1024;
  const maxFileCount = 500;
  let selectedFiles = [];
  let previewUrls = [];
  let draggedIndex = null;

  function setMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle('text-danger', isError);
  }

  function syncInput() {
    const transfer = new DataTransfer();
    selectedFiles.forEach(file => transfer.items.add(file));
    input.files = transfer.files;
  }

  function render() {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    previewUrls = [];
    preview.replaceChildren();

    selectedFiles.forEach((file, index) => {
      const objectUrl = URL.createObjectURL(file);
      previewUrls.push(objectUrl);

      const item = document.createElement('article');
      item.className = 'chapter-page-preview';
      item.draggable = true;
      item.dataset.index = String(index);
      item.innerHTML = `
        <img src="${objectUrl}" alt="Trang ${index + 1}" />
        <button type="button" class="chapter-page-remove" aria-label="Xóa trang ${index + 1}">
          <i class="bi bi-x-lg"></i>
        </button>
        <div class="chapter-page-meta">
          <span class="chapter-page-number">${index + 1}</span>
          <span class="chapter-page-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
        </div>`;

      item.querySelector('.chapter-page-remove').addEventListener('click', event => {
        event.stopPropagation();
        selectedFiles.splice(index, 1);
        syncInput();
        render();
      });

      item.addEventListener('dragstart', () => {
        draggedIndex = index;
        item.classList.add('is-dragging');
      });
      item.addEventListener('dragend', () => {
        draggedIndex = null;
        item.classList.remove('is-dragging');
      });
      item.addEventListener('dragover', event => event.preventDefault());
      item.addEventListener('drop', event => {
        event.preventDefault();
        const targetIndex = Number(item.dataset.index);
        if (draggedIndex === null || draggedIndex === targetIndex) return;
        const [movedFile] = selectedFiles.splice(draggedIndex, 1);
        selectedFiles.splice(targetIndex, 0, movedFile);
        syncInput();
        render();
      });

      preview.appendChild(item);
    });

    pageCount.textContent = `${selectedFiles.length} trang`;
    if (selectedFiles.length === 0) setMessage('');
  }

  function escapeHtml(value) {
    const element = document.createElement('span');
    element.textContent = value;
    return element.innerHTML;
  }

  function addFiles(fileList) {
    const incoming = Array.from(fileList);
    const rejected = incoming.filter(file => !acceptedTypes.has(file.type) || file.size > maxFileSize);
    const valid = incoming.filter(file => acceptedTypes.has(file.type) && file.size <= maxFileSize);

    if (selectedFiles.length + valid.length > maxFileCount) {
      setMessage(`Mỗi chapter chỉ được chọn tối đa ${maxFileCount} ảnh.`, true);
      return;
    }

    selectedFiles = ChapterFileOrder.mergeChapterFiles(selectedFiles, valid);
    syncInput();
    render();

    if (rejected.length > 0) {
      setMessage(`${rejected.length} file bị bỏ qua vì sai định dạng hoặc vượt quá 15 MB.`, true);
    } else if (valid.length > 0) {
      setMessage(`Đã thêm ${valid.length} ảnh. Kéo các trang để đổi thứ tự.`);
    }
  }

  chooseButton.addEventListener('click', event => {
    event.stopPropagation();
    input.click();
  });
  dropZone.addEventListener('click', event => {
    if (event.target === input || event.target.closest('button')) return;
    input.click();
  });
  dropZone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  });
  input.addEventListener('change', () => {
    addFiles(input.files);
    syncInput();
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, event => {
      event.preventDefault();
      dropZone.classList.add('is-dragging');
    });
  });
  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, event => {
      event.preventDefault();
      dropZone.classList.remove('is-dragging');
    });
  });
  dropZone.addEventListener('drop', event => addFiles(event.dataTransfer.files));

  form.addEventListener('submit', event => {
    const hasUrls = urlInput?.value.trim().length > 0;
    if (selectedFiles.length === 0 && !hasUrls) {
      event.preventDefault();
      setMessage('Hãy chọn ít nhất một ảnh hoặc nhập URL trang truyện.', true);
      dropZone.focus();
      return;
    }

    if (!form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
      return;
    }

    submitButton.disabled = true;
    submitButton.querySelector('span').textContent = 'Đang tải chapter...';
  });

  window.addEventListener('beforeunload', () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
  });
})();
