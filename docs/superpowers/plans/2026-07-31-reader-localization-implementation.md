# Reader Sidebar and Report Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đồng bộ chuyển đổi Việt/Anh tức thời cho sidebar phải, Reader Settings và modal báo cáo dùng chung mà không thay đổi dữ liệu báo cáo hoặc trạng thái đọc.

**Architecture:** Dùng duy nhất `I18N`, `vi.json` và `en.json`. Markup tĩnh dùng `data-i18n`; ba module tạo nội dung động dùng `t(key, fallback)` và render lại khi nhận `manganpk:localechanged`, đồng thời giữ nguyên state hiện tại.

**Tech Stack:** ASP.NET Core Razor, JavaScript thuần, JSON locale, Node test runner, .NET 10.

## Global Constraints

- Không đổi API, route, DTO hoặc database.
- Không đổi layout, CSS hoặc màu sắc.
- Không dịch tên truyện, tên chương hay dữ liệu tự do.
- `value` của mọi lý do báo cáo phải giữ nguyên chuỗi tiếng Anh hiện tại.
- Đổi locale không đóng sidebar/modal, không đổi trang/chương và không xóa dữ liệu form.
- Không sửa hoặc stage `appthoitrang_ascii/`.

---

### Task 1: Khóa contract locale và markup bằng test

**Files:**
- Create: `backend.Tests/js/reader-localization.test.cjs`
- Read: `backend/Views/ChapterView/Read.cshtml`
- Read: `backend/Views/Shared/_ReportModal.cshtml`
- Read: `backend/wwwroot/locales/vi.json`
- Read: `backend/wwwroot/locales/en.json`

**Interfaces:**
- Consumes: các file Razor và locale hiện tại.
- Produces: contract test cho toàn bộ khóa và translation hook của tính năng.

- [ ] **Step 1: Viết failing contract test**

Tạo `backend.Tests/js/reader-localization.test.cjs`:

```javascript
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../backend');
const read = relative =>
  fs.readFileSync(path.join(root, relative), 'utf8');
const readerView = read('Views/ChapterView/Read.cshtml');
const reportView = read('Views/Shared/_ReportModal.cshtml');
const reader = read('wwwroot/js/reader.js');
const settings = read('wwwroot/js/reader-settings.js');
const report = read('wwwroot/js/report-modal.js');
const vi = JSON.parse(read('wwwroot/locales/vi.json'));
const en = JSON.parse(read('wwwroot/locales/en.json'));

const requiredKeys = [
  'reader.page',
  'reader.chapter',
  'reader.reportChapter',
  'reader.longStrip',
  'reader.fitBoth',
  'reader.leftToRight',
  'reader.rightToLeft',
  'reader.headerHidden',
  'reader.headerShown',
  'reader.progressNormal',
  'reader.progressLightbar',
  'reader.progressHidden',
  'reader.settings',
  'reader.settings.pageLayout',
  'reader.settings.imageFit',
  'reader.settings.keybinds',
  'reader.settings.behaviors',
  'report.title',
  'report.reportingChapter',
  'report.reportingTitle',
  'report.reason',
  'report.chooseReason',
  'report.explanation',
  'report.cancel',
  'report.submit',
  'report.reasonRequired',
  'report.otherExplanationRequired',
  'report.sendError',
  'report.sent'
];

test('reader and report dictionaries have matching required keys', () => {
  const viKeys = Object.keys(vi)
    .filter(key => key.startsWith('reader.') || key.startsWith('report.'))
    .sort();
  const enKeys = Object.keys(en)
    .filter(key => key.startsWith('reader.') || key.startsWith('report.'))
    .sort();
  assert.deepEqual(viKeys, enKeys);
  for (const key of requiredKeys) {
    assert.equal(typeof vi[key], 'string', `Missing Vietnamese ${key}`);
    assert.equal(typeof en[key], 'string', `Missing English ${key}`);
  }
});

test('reader drawer and settings expose translation hooks', () => {
  for (const key of [
    'reader.page',
    'reader.chapter',
    'reader.reportChapter',
    'reader.longStrip',
    'reader.fitBoth',
    'reader.settings'
  ]) {
    assert.match(readerView, new RegExp(`data-i18n="${key.replace('.', '\\.')}`));
  }
  assert.doesNotMatch(
    readerView,
    />\\s*(Report Chapter|Reader Settings|Page Layout|Image fit)\\s*</);
});

test('shared report modal exposes translation hooks', () => {
  for (const key of [
    'report.title',
    'report.reason',
    'report.chooseReason',
    'report.explanation',
    'report.cancel',
    'report.submit'
  ]) {
    assert.match(reportView, new RegExp(`data-i18n="${key.replace('.', '\\.')}`));
  }
});

test('dynamic reader and report modules refresh on locale change', () => {
  assert.match(reader, /manganpk:localechanged/);
  assert.match(settings, /manganpk:localechanged/);
  assert.match(report, /manganpk:localechanged/);
});

test('report reasons keep canonical values and translate labels', () => {
  assert.match(report, /value="\\$\\{escapeHtml\\(reason\\.value\\)\\}"/);
  assert.match(report, /t\\(reason\\.key,/);
  assert.match(report, /selectedReason/);
  assert.match(report, /selectedExplanation/);
});
```

- [ ] **Step 2: Chạy test để xác nhận RED**

Run:

```powershell
node --test backend.Tests\js\reader-localization.test.cjs
```

Expected: FAIL vì locale keys, hooks và locale-change handlers chưa tồn tại.

- [ ] **Step 3: Commit test đỏ**

```powershell
git add -- backend.Tests/js/reader-localization.test.cjs
git commit -m "test: define reader localization contract"
```

---

### Task 2: Thêm locale keys và translation hooks tĩnh

**Files:**
- Modify: `backend/wwwroot/locales/vi.json`
- Modify: `backend/wwwroot/locales/en.json`
- Modify: `backend/Views/ChapterView/Read.cshtml:124-306`
- Modify: `backend/Views/Shared/_ReportModal.cshtml`

**Interfaces:**
- Consumes: `I18N.apply()` và `data-i18n`.
- Produces: các khóa `reader.*`, `reader.settings.*`, `reader.keybind.*`, `report.*`, `report.reason.*`.

- [ ] **Step 1: Thêm đầy đủ khóa đối xứng**

Thêm cùng tập key vào hai locale. Những nhóm bắt buộc:

```json
{
  "reader.page": "Trang",
  "reader.chapter": "Chương",
  "reader.reportChapter": "Báo cáo chương",
  "reader.longStrip": "Cuộn dọc",
  "reader.fitBoth": "Vừa cả hai chiều",
  "reader.leftToRight": "Trái sang phải",
  "reader.rightToLeft": "Phải sang trái",
  "reader.headerHidden": "Ẩn thanh đầu trang",
  "reader.headerShown": "Hiện thanh đầu trang",
  "reader.progressNormal": "Tiến trình bình thường",
  "reader.progressLightbar": "Thanh tiến trình mảnh",
  "reader.progressHidden": "Ẩn tiến trình",
  "reader.settings": "Cài đặt đọc",
  "reader.settings.pageLayout": "Bố cục trang",
  "reader.settings.imageFit": "Căn chỉnh ảnh",
  "reader.settings.keybinds": "Phím tắt",
  "reader.settings.behaviors": "Hành vi",
  "report.title": "Báo cáo",
  "report.reportingChapter": "Báo cáo chương",
  "report.reportingTitle": "Báo cáo truyện",
  "report.reason": "Lý do",
  "report.chooseReason": "Chọn một lý do",
  "report.explanation": "Giải thích thêm",
  "report.cancel": "Hủy",
  "report.submit": "Gửi báo cáo",
  "report.reasonRequired": "Vui lòng chọn lý do.",
  "report.otherExplanationRequired": "Vui lòng giải thích khi chọn Khác.",
  "report.sendError": "Không thể gửi báo cáo.",
  "report.sent": "Đã gửi báo cáo."
}
```

English file uses equivalent English labels. Add every Reader Settings label, keybind action and report reason as explicit keys. Keep both JSON key sets identical.

- [ ] **Step 2: Gắn hook vào sidebar và Reader Settings**

Trong `Read.cshtml`, convert text nodes, titles and aria labels:

```html
<small data-i18n="reader.page">Trang</small>
<small data-i18n="reader.chapter">Chương</small>
<button id="reader-report-chapter"
        class="reader-drawer-wide-btn"
        data-i18n="reader.reportChapter">Báo cáo chương</button>
<span data-i18n="reader.longStrip">Cuộn dọc</span>
<span data-i18n="reader.fitBoth">Vừa cả hai chiều</span>
<span data-i18n="reader.settings">Cài đặt đọc</span>
```

Apply the same structure to every tab, heading, segmented option, help text, reset button, `title` and `aria-label` in the settings modal.

- [ ] **Step 3: Gắn hook vào shared report modal**

```html
<h2 id="report-modal-title" data-i18n="report.title">Báo cáo</h2>
<button type="button"
        class="report-modal-close"
        data-report-close
        aria-label="Đóng"
        data-i18n="common.close"
        data-i18n-attr="aria-label">×</button>
<span id="report-target-label"></span>
<label for="report-reason" data-i18n="report.reason">Lý do</label>
<option value="" data-i18n="report.chooseReason">Chọn một lý do</option>
<label for="report-explanation"
       data-i18n="report.explanation">Giải thích thêm</label>
<button class="report-cancel"
        data-report-close
        data-i18n="report.cancel">Hủy</button>
<button id="report-submit"
        class="report-submit"
        data-i18n="report.submit">Gửi báo cáo</button>
```

- [ ] **Step 4: Chạy test contract**

Run:

```powershell
node --test backend.Tests\js\reader-localization.test.cjs
```

Expected: static-hook tests PASS; dynamic-module tests vẫn FAIL.

- [ ] **Step 5: Commit phần tĩnh**

```powershell
git add -- backend/wwwroot/locales/vi.json backend/wwwroot/locales/en.json backend/Views/ChapterView/Read.cshtml backend/Views/Shared/_ReportModal.cshtml
git commit -m "feat: localize reader sidebar and settings markup"
```

---

### Task 3: Render lại nội dung động của reader

**Files:**
- Modify: `backend/wwwroot/js/reader.js`
- Modify: `backend/wwwroot/js/reader-settings.js`
- Test: `backend.Tests/js/reader-localization.test.cjs`
- Verify: `backend.Tests/js/reader-settings-contract.test.cjs`

**Interfaces:**
- Consumes: `window.t(key, fallback)` và `manganpk:localechanged`.
- Produces: `refreshReaderLocale()` và `refreshReaderSettingsLocale()`.

- [ ] **Step 1: Bổ sung assertions cho refresh không đổi state**

Thêm vào test:

```javascript
test('reader locale refresh rerenders labels without resetting preferences', () => {
  assert.match(reader, /function refreshReaderLocale\\(\\)/);
  assert.match(reader, /updateHeaderLabels\\(\\)/);
  assert.match(reader, /updateDrawerButtonStates\\(\\)/);
  assert.match(reader, /renderReaderDrawerPageOptions\\(\\)/);
  assert.match(reader, /renderReaderDrawerChapterOptions\\(\\)/);
  assert.doesNotMatch(reader, /function refreshReaderLocale[\\s\\S]*localStorage\\.setItem/);

  assert.match(settings, /function refreshReaderSettingsLocale\\(\\)/);
  assert.match(settings, /renderReaderKeybinds\\(\\)/);
  assert.doesNotMatch(settings, /function refreshReaderSettingsLocale[\\s\\S]*localStorage\\.(?:setItem|removeItem)/);
});
```

Run targeted test and confirm FAIL because functions do not exist.

- [ ] **Step 2: Dịch nhãn động của drawer**

Trong `updateHeaderLabels()`:

```javascript
const chapterWord = t('reader.chapter', 'Chương');
if (drawerChapterLabel) {
  drawerChapterLabel.textContent =
    `${chapterWord} ${chapterDetail.chapterNumber}`;
}
if (drawerChapterTitle) {
  drawerChapterTitle.textContent =
    `${chapterWord} ${chapterDetail.chapterNumber}`;
}
```

Trong `updateDrawerButtonStates()`:

```javascript
progressText.textContent = progressMode === 'normal'
  ? t('reader.progressNormal', 'Tiến trình bình thường')
  : progressMode === 'lightbar'
    ? t('reader.progressLightbar', 'Thanh tiến trình mảnh')
    : t('reader.progressHidden', 'Ẩn tiến trình');

directionText.textContent = readerDirection === 'ltr'
  ? t('reader.leftToRight', 'Trái sang phải')
  : t('reader.rightToLeft', 'Phải sang trái');
```

Thay fallback `Chapter` trong `openReportModal(...)` bằng `t('reader.chapter', 'Chương')`.

- [ ] **Step 3: Thêm một refresh function không sửa state**

```javascript
function refreshReaderLocale() {
  renderReaderMetadata();
  updateHeaderLabels();
  renderChaptersDropdown();
  renderReaderDrawerPageOptions();
  renderReaderDrawerChapterOptions();
  updateDrawerButtonStates();
}

window.addEventListener(
  'manganpk:localechanged',
  refreshReaderLocale);
```

Không gọi setters và không ghi localStorage trong hàm này.

- [ ] **Step 4: Dịch keybind labels và render lại**

Trong `renderReaderKeybinds()` dùng:

```javascript
const labels = {
  toggleMenu: t('reader.keybind.toggleMenu', 'Bật/tắt menu'),
  pageRight: t('reader.keybind.pageRight', 'Lật trang sang phải'),
  pageLeft: t('reader.keybind.pageLeft', 'Lật trang sang trái'),
  scrollUp: t('reader.keybind.scrollUp', 'Cuộn lên'),
  scrollDown: t('reader.keybind.scrollDown', 'Cuộn xuống'),
  chapterForward: t('reader.keybind.chapterForward', 'Chương kế tiếp'),
  chapterBackward: t('reader.keybind.chapterBackward', 'Chương trước'),
  immersive: t('reader.keybind.immersive', 'Bật/tắt chế độ tập trung'),
  cycleFit: t('reader.keybind.cycleFit', 'Đổi kiểu căn ảnh')
};
```

Thêm:

```javascript
function refreshReaderSettingsLocale() {
  renderReaderKeybinds();
  syncReaderSettingsUI();
}

window.addEventListener(
  'manganpk:localechanged',
  refreshReaderSettingsLocale);
```

- [ ] **Step 5: Chạy reader tests**

Run:

```powershell
node --test backend.Tests\js\reader-localization.test.cjs backend.Tests\js\reader-settings-contract.test.cjs backend.Tests\js\reader-display-modes.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit reader dynamic localization**

```powershell
git add -- backend/wwwroot/js/reader.js backend/wwwroot/js/reader-settings.js backend.Tests/js/reader-localization.test.cjs
git commit -m "feat: refresh reader controls on locale change"
```

---

### Task 4: Dịch modal báo cáo và giữ nguyên payload

**Files:**
- Modify: `backend/wwwroot/js/report-modal.js`
- Test: `backend.Tests/js/reader-localization.test.cjs`
- Verify: `backend.Tests/js/report-modal-contract.test.cjs`
- Verify: `backend.Tests/js/report-api-contract.test.cjs`

**Interfaces:**
- Consumes: `t(key, fallback)`, report reason locale keys và `manganpk:localechanged`.
- Produces: canonical reason values với translated labels.

- [ ] **Step 1: Bổ sung test canonical values và state preservation**

Test phải yêu cầu reason definitions dạng:

```javascript
{ value: 'Images not loading', key: 'report.reason.imagesNotLoading' }
```

và locale handler phải đọc lại:

```javascript
const selectedReason = select?.value || '';
const selectedExplanation = explanation?.value || '';
renderTarget();
renderReasons(selectedReason);
explanation.value = selectedExplanation;
```

Run targeted test và xác nhận FAIL.

- [ ] **Step 2: Chuyển reason arrays thành value/key**

```javascript
const mangaReasons = [
  {
    value: 'Duplicate entry',
    key: 'report.reason.duplicateEntry'
  },
  // Giữ đủ toàn bộ reason hiện tại.
];

const chapterReasons = [
  {
    value: 'Images not loading',
    key: 'report.reason.imagesNotLoading'
  },
  // Giữ đủ toàn bộ reason hiện tại.
];
```

Không đổi bất kỳ `value` nào.

- [ ] **Step 3: Tách renderReasons**

```javascript
function renderReasons(selectedValue = '') {
  const select = document.getElementById('report-reason');
  if (!select || !state) return;
  const reasons = state.targetType === 'Chapter'
    ? chapterReasons
    : mangaReasons;
  select.innerHTML =
    `<option value="">${escapeHtml(
      t('report.chooseReason', 'Chọn một lý do'))}</option>` +
    reasons.map(reason => `
      <option value="${escapeHtml(reason.value)}">
        ${escapeHtml(t(reason.key, reason.value))}
      </option>`).join('');
  select.value = selectedValue;
}
```

- [ ] **Step 4: Dịch target, validation và toast**

```javascript
label.textContent = isChapter
  ? t('report.reportingChapter', 'Báo cáo chương')
  : t('report.reportingTitle', 'Báo cáo truyện');

if (!reason) {
  return setError(
    t('report.reasonRequired', 'Vui lòng chọn lý do.'));
}
if (reason === 'Other' && !explanation) {
  return setError(t(
    'report.otherExplanationRequired',
    'Vui lòng giải thích khi chọn Khác.'));
}
```

Default error và success toast cũng dùng `report.sendError` và `report.sent`. Message cụ thể trả từ API tiếp tục được giữ nguyên.

- [ ] **Step 5: Render lại locale nhưng giữ form**

```javascript
window.addEventListener('manganpk:localechanged', () => {
  if (!state) return;
  const select = document.getElementById('report-reason');
  const explanation =
    document.getElementById('report-explanation');
  const selectedReason = select?.value || '';
  const selectedExplanation = explanation?.value || '';

  renderTarget();
  renderReasons(selectedReason);
  if (explanation) explanation.value = selectedExplanation;
});
```

Không gọi `openReportModal()` trong listener vì hàm đó xóa explanation.

- [ ] **Step 6: Chạy report tests**

Run:

```powershell
node --test backend.Tests\js\reader-localization.test.cjs backend.Tests\js\report-modal-contract.test.cjs backend.Tests\js\report-api-contract.test.cjs
```

Expected: PASS; reason strings canonical vẫn có trong source.

- [ ] **Step 7: Commit report localization**

```powershell
git add -- backend/wwwroot/js/report-modal.js backend.Tests/js/reader-localization.test.cjs
git commit -m "feat: localize report modal without changing payloads"
```

---

### Task 5: Cache version và kiểm tra hồi quy

**Files:**
- Modify: `backend/Views/ChapterView/Read.cshtml`
- Modify: `backend/Views/MangaView/Detail.cshtml`
- Verify only: toàn bộ test suite.

**Interfaces:**
- Consumes: các JavaScript asset đã đổi.
- Produces: browser luôn lấy đúng phiên bản mới.

- [ ] **Step 1: Tăng query version của asset đã đổi**

Trong hai Razor views, tăng version cho:

```html
<script src="/js/reader-settings.js?v=2.0"></script>
<script src="/js/reader.js?v=2.0"></script>
<script src="/js/report-modal.js?v=2.0"></script>
```

Chỉ cập nhật file thực sự được page đó tải.

- [ ] **Step 2: Chạy toàn bộ JavaScript tests**

```powershell
node --test backend.Tests\js
```

Expected: 0 failed.

- [ ] **Step 3: Chạy toàn bộ backend tests**

```powershell
dotnet test backend.Tests\MangaNPK.Tests.csproj `
  --configuration Release `
  --no-restore `
  --filter "FullyQualifiedName!~SourceEncodingTests" `
  --verbosity quiet
```

Expected: 0 failed.

- [ ] **Step 4: Build Release**

```powershell
dotnet build backend\MangaNPK.csproj `
  --configuration Release `
  --no-restore `
  --verbosity minimal
```

Expected: 0 warnings, 0 errors.

- [ ] **Step 5: Manual smoke**

Trên một instance web duy nhất:

1. Mở một chương và mở sidebar phải.
2. Đổi Việt/Anh khi sidebar đang mở; kiểm tra mọi nhãn đổi ngay.
3. Mở Reader Settings, chọn tab và option; đổi ngôn ngữ; tab và option vẫn được chọn.
4. Mở báo cáo chương, chọn reason và nhập explanation; đổi ngôn ngữ; dữ liệu không mất.
5. Gửi báo cáo; kiểm tra payload vẫn chứa reason tiếng Anh chuẩn.
6. Mở báo cáo từ chi tiết truyện và lặp lại.

- [ ] **Step 6: Kiểm tra diff và commit**

```powershell
git diff --check
git status --short
git add -- backend/Views/ChapterView/Read.cshtml backend/Views/MangaView/Detail.cshtml
git commit -m "chore: refresh localized reader assets"
```

Expected: không có migration, API/controller change hoặc file từ `appthoitrang_ascii/`.
