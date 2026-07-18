# Admin Title Draft Single-Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hiển thị toàn bộ tám phần của form bản nháp truyện admin trên một trang cuộn liên tục và cho phép menu trái cuộn tới, đồng thời tự đánh dấu phần đang xem.

**Architecture:** Razor view giữ nguyên tám `data-section-panel` và dữ liệu form nhưng đổi CSS từ tab ẩn/hiện sang các card liên tục. JavaScript tách cập nhật trạng thái menu, cuộn tới phần và theo dõi vùng nhìn bằng `IntersectionObserver`; các hàm tạo payload và gọi API không thay đổi.

**Tech Stack:** ASP.NET Core MVC Razor, CSS, JavaScript thuần, Node.js `node:test` contract tests.

## Global Constraints

- Giữ đủ tám phần theo thứ tự: `basic`, `publish`, `authors`, `tags`, `images`, `links`, `translation`, `review`.
- Không thay đổi API, cấu trúc payload hoặc quy tắc tạo, sửa, lưu nháp, đăng, duyệt và từ chối.
- Desktop dùng menu sticky bên trái; màn hình tối đa 900px dùng menu ngang cuộn được.
- Light mode và dark mode phải dùng các biến màu giao diện hiện có.
- Điều hướng vẫn hoạt động nếu trình duyệt không hỗ trợ `IntersectionObserver`.

---

### Task 1: Khóa hợp đồng giao diện một trang và điều hướng cuộn

**Files:**
- Create: `backend.Tests/js/admin-title-draft-single-page.test.cjs`
- Inspect: `backend/Views/AdminView/Index.cshtml:143-260`
- Inspect: `backend/wwwroot/js/admin-title-drafts.js:98-134`

**Interfaces:**
- Consumes: tám nút `.title-draft-section-btn[data-section]` và tám panel `.title-draft-section[data-section-panel]` hiện có.
- Produces: hợp đồng DOM/CSS/JavaScript cho `setActiveTitleDraftSection(section)`, `scrollToTitleDraftSection(section, behavior = 'smooth')`, `initTitleDraftSectionObserver()` và `disconnectTitleDraftSectionObserver()`.

- [ ] **Step 1: Viết contract test thất bại**

Tạo `backend.Tests/js/admin-title-draft-single-page.test.cjs`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const view = fs.readFileSync(path.join(root, 'backend', 'Views', 'AdminView', 'Index.cshtml'), 'utf8');
const script = fs.readFileSync(path.join(root, 'backend', 'wwwroot', 'js', 'admin-title-drafts.js'), 'utf8');
const sections = ['basic', 'publish', 'authors', 'tags', 'images', 'links', 'translation', 'review'];

test('all title draft sections remain in one continuous form', () => {
  for (const section of sections) {
    assert.match(view, new RegExp(`data-section-panel="${section}"`));
  }
  assert.doesNotMatch(view, /\.title-draft-section\s*\{[^}]*display:\s*none/s);
  assert.match(view, /\.title-draft-section\s*\{[^}]*scroll-margin-top:/s);
});

test('title draft navigation scrolls to sections and tracks the visible section', () => {
  assert.match(script, /function setActiveTitleDraftSection\(section\)/);
  assert.match(script, /function scrollToTitleDraftSection\(section, behavior = 'smooth'\)/);
  assert.match(script, /scrollIntoView\(\{ behavior, block: 'start' \}\)/);
  assert.match(script, /function initTitleDraftSectionObserver\(\)/);
  assert.match(script, /new IntersectionObserver\(/);
  assert.match(script, /function disconnectTitleDraftSectionObserver\(\)/);
});

test('title draft navigation has a mobile horizontal layout', () => {
  assert.match(view, /@@media \(max-width: 900px\)/);
  assert.match(view, /\.title-draft-nav\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(view, /\.title-draft-section-btn\s*\{[^}]*white-space:\s*nowrap/s);
});
```

- [ ] **Step 2: Chạy test để xác nhận đang thất bại**

Run:

```powershell
node --test backend.Tests/js/admin-title-draft-single-page.test.cjs
```

Expected: FAIL vì CSS hiện còn `display: none` và các hàm cuộn/observer chưa tồn tại.

- [ ] **Step 3: Commit test thất bại**

```powershell
git add backend.Tests/js/admin-title-draft-single-page.test.cjs
git commit -m "test: define title draft single-page behavior"
```

---

### Task 2: Chuyển form từ tab sang trang cuộn liên tục

**Files:**
- Modify: `backend/Views/AdminView/Index.cshtml:143-260`
- Modify: `backend/Views/AdminView/Index.cshtml:512-531`
- Modify: `backend/wwwroot/js/admin-title-drafts.js:98-134`
- Modify: `backend/wwwroot/js/admin.js:380-382`
- Test: `backend.Tests/js/admin-title-draft-single-page.test.cjs`

**Interfaces:**
- Consumes: `data-section`, `data-section-panel` và hợp đồng hàm từ Task 1.
- Produces: tám card hiển thị liên tục, menu desktop/mobile và điều hướng cuộn mượt không ảnh hưởng dữ liệu form.

- [ ] **Step 1: Đổi CSS section thành các card liên tục**

Trong `backend/Views/AdminView/Index.cshtml`, thay quy tắc ẩn/hiện bằng:

```css
.title-draft-main { min-width: 0; }
.title-draft-section {
  display: block;
  scroll-margin-top: 96px;
  margin-bottom: 18px;
  padding: 20px;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  background: var(--bg-card);
}
.title-draft-section h4 {
  color: var(--text-main);
  font-size: 1.05rem;
  font-weight: 800;
  margin: 0 0 16px;
}
```

Xóa `.title-draft-section.active { display: block; }`. Đổi màu nền/viền cứng của menu và thanh hành động sang `var(--border-subtle)` và `var(--bg-main)` để dùng được ở cả light/dark mode.

- [ ] **Step 2: Đổi menu mobile thành hàng ngang cuộn được**

Trong media query tối đa 900px, dùng:

```css
.title-draft-nav {
  position: sticky;
  top: 72px;
  z-index: 6;
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  border-right: 0;
  padding: 8px;
  background: var(--bg-main);
}
.title-draft-section-btn {
  flex: 0 0 auto;
  width: auto;
  white-space: nowrap;
}
.title-draft-section { scroll-margin-top: 142px; }
```

- [ ] **Step 3: Tách active state khỏi hành vi cuộn**

Trong `backend/wwwroot/js/admin-title-drafts.js`, thay `setTitleDraftSection` bằng:

```js
let titleDraftSectionObserver = null;

function setActiveTitleDraftSection(section) {
  document.querySelectorAll('.title-draft-section-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });
}

function scrollToTitleDraftSection(section, behavior = 'smooth') {
  const panel = document.querySelector(`.title-draft-section[data-section-panel="${section}"]`);
  if (!panel) return;
  setActiveTitleDraftSection(section);
  panel.scrollIntoView({ behavior, block: 'start' });
}
```

- [ ] **Step 4: Theo dõi phần đang nhìn thấy và chống gắn observer trùng**

Thêm ngay sau hai hàm trên:

```js
function disconnectTitleDraftSectionObserver() {
  titleDraftSectionObserver?.disconnect();
  titleDraftSectionObserver = null;
}

function initTitleDraftSectionObserver() {
  disconnectTitleDraftSectionObserver();
  if (!('IntersectionObserver' in window)) return;

  const panels = [...document.querySelectorAll('.title-draft-section[data-section-panel]')];
  if (!panels.length) return;

  titleDraftSectionObserver = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setActiveTitleDraftSection(visible.target.dataset.sectionPanel);
  }, { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.2, 0.5, 0.75] });

  panels.forEach(panel => titleDraftSectionObserver.observe(panel));
}
```

- [ ] **Step 5: Nối menu và vòng đời mở/đóng form**

Trong `backend/wwwroot/js/admin.js`, tại nơi đang gắn sự kiện `.title-draft-section-btn`, đổi callback thành:

```js
btn.addEventListener('click', () => scrollToTitleDraftSection(btn.dataset.section));
```

Trong `showTitleDraftForm()` sau khi hiện form:

```js
setActiveTitleDraftSection('basic');
requestAnimationFrame(() => {
  scrollToTitleDraftSection('basic', 'auto');
  initTitleDraftSectionObserver();
});
```

Trong `resetTitleDraftForm()` trước khi ẩn form:

```js
disconnectTitleDraftSectionObserver();
setActiveTitleDraftSection('basic');
```

Loại bỏ mọi lời gọi còn lại tới `setTitleDraftSection`.

- [ ] **Step 6: Chạy contract test**

Run:

```powershell
node --test backend.Tests/js/admin-title-draft-single-page.test.cjs
```

Expected: 3 tests PASS.

- [ ] **Step 7: Chạy toàn bộ JavaScript tests**

Run:

```powershell
node --test backend.Tests/js/*.test.cjs
```

Expected: toàn bộ test PASS, không có regression ở admin modules.

- [ ] **Step 8: Chạy backend tests và build**

Run:

```powershell
dotnet test backend.Tests/MangaNPK.Tests.csproj --no-restore
dotnet build backend/MangaNPK.csproj --no-restore
```

Expected: cả hai lệnh exit code 0, không có test fail hoặc build error.

- [ ] **Step 9: Kiểm tra giao diện thủ công**

Mở trang `/admin`, chọn mục Đăng truyện và xác nhận:

1. Bản nháp mới hiển thị đủ tám phần liên tục.
2. Nhấn từng mục menu cuộn đúng phần và không xóa dữ liệu đã nhập.
3. Tự cuộn làm active menu đổi theo phần đang xem.
4. Mở lại form hoặc một bản nháp cũ bắt đầu ở Tiêu đề.
5. Desktop giữ menu trái; màn hình dưới 900px hiển thị menu ngang.
6. Card, chữ, viền và thanh hành động rõ ràng trong light mode và dark mode.

- [ ] **Step 10: Commit implementation**

```powershell
git add backend/Views/AdminView/Index.cshtml backend/wwwroot/js/admin-title-drafts.js backend/wwwroot/js/admin.js
git commit -m "feat: make title draft form a scrollable single page"
```
