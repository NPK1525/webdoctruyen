(() => {
  const authors = [];
  const form = document.getElementById('title-submission-form');
  if (!form) return;
  const list = document.getElementById('authorList');
  const renderAuthors = () => {
    list.innerHTML = authors.length ? authors.map((a, i) => `<button type="button" class="taxonomy-chip" data-index="${i}"><span>${escapeHtml(a.name)} (${escapeHtml(a.role)}) ×</span></button>`).join('') : '<span style="color:var(--text-muted);">Chưa thêm tác giả.</span>';
    list.querySelectorAll('[data-index]').forEach(button => button.addEventListener('click', () => { authors.splice(Number(button.dataset.index), 1); renderAuthors(); }));
  };
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  document.getElementById('addAuthor').addEventListener('click', () => {
    const select = document.getElementById('authorId');
    const authorId = Number(select.value) || null;
    const name = authorId ? select.options[select.selectedIndex].text : document.getElementById('newAuthor').value.trim();
    const role = document.getElementById('authorRole').value;
    if (!name) return;
    if (authors.some(a => a.authorId === authorId && a.name.toLowerCase() === name.toLowerCase() && a.role === role)) return;
    authors.push({ authorId, name, role });
    select.value = '';
    document.getElementById('newAuthor').value = '';
    renderAuthors();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const payload = {
      title: document.getElementById('title').value.trim(),
      originalTitle: document.getElementById('originalTitle').value.trim(),
      description: document.getElementById('description').value.trim(),
      coverUrl: document.getElementById('coverUrl').value.trim(),
      format: Number(document.getElementById('format').value),
      authors,
      genreIds: [...document.querySelectorAll('#genreList input:checked')].map(input => Number(input.value)),
      themeIds: [...document.querySelectorAll('#themeList input:checked')].map(input => Number(input.value)),
      contentWarnings: [...document.querySelectorAll('.warning-chip input:checked')].map(input => input.value)
    };
    const response = await fetch('/api/title-submissions', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    const message = document.getElementById('submission-message');
    message.textContent = data.message || (response.ok ? 'Đã gửi duyệt.' : 'Không thể gửi truyện.');
    if (response.ok) form.reset();
  });
  renderAuthors();
})();
