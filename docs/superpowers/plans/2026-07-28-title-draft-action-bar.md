# Title Draft Action Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Loại bỏ mảng nền đen lệch màu phía sau nút Hủy và Đăng truyện trong form bản nháp.

**Architecture:** Giữ nguyên markup, hành vi sticky và bố cục responsive. Chỉ thay nền `.title-draft-actions` từ màu nền trang sang trong suốt, đồng thời khóa hành vi bằng một kiểm thử CSS hồi quy.

**Tech Stack:** Razor, CSS, Node.js test runner.

## Global Constraints

- Không thay đổi hành vi, icon hoặc nội dung dịch thuật của nút.
- Giữ các nút căn phải và cho phép xuống dòng trên màn hình nhỏ.
- Hoạt động với cả dark mode và light mode thông qua biến giao diện hiện có.

---

### Task 1: Đồng bộ nền thanh hành động

**Files:**
- Modify: `backend/Views/AdminView/Index.cshtml`
- Test: `backend.Tests/js/admin-title-draft-actions.test.cjs`

**Interfaces:**
- Consumes: Quy tắc CSS hiện có `.title-draft-actions`.
- Produces: Thanh hành động nền trong suốt, vẫn sticky và căn phải.

- [ ] **Step 1: Viết kiểm thử thất bại**

Thêm kiểm thử:

```js
test('title draft action bar blends into the form surface', () => {
  const rule = view.match(/\.title-draft-actions\s*\{([^}]*)\}/)?.[1] || '';
  assert.match(rule, /background:\s*transparent/);
  assert.doesNotMatch(rule, /background:\s*var\(--bg-main\)/);
  assert.match(rule, /justify-content:\s*flex-end/);
  assert.match(rule, /border-top:\s*1px solid var\(--border-subtle\)/);
});
```

- [ ] **Step 2: Chạy kiểm thử để xác nhận đang thất bại**

Run:

```powershell
node --test backend.Tests/js/admin-title-draft-actions.test.cjs
```

Expected: FAIL vì `.title-draft-actions` vẫn dùng `background: var(--bg-main)`.

- [ ] **Step 3: Sửa CSS tối thiểu**

Trong `.title-draft-actions`, thay:

```css
background: var(--bg-main);
```

bằng:

```css
background: transparent;
```

- [ ] **Step 4: Chạy kiểm thử và build**

Run:

```powershell
node --test backend.Tests/js/admin-title-draft-actions.test.cjs
dotnet build backend\MangaNPK.csproj --configuration Release --no-restore
git diff --check
```

Expected: kiểm thử PASS, build có 0 lỗi và `git diff --check` không báo lỗi.

- [ ] **Step 5: Commit**

```powershell
git add backend/Views/AdminView/Index.cshtml backend.Tests/js/admin-title-draft-actions.test.cjs
git commit -m "fix: blend title draft actions into form"
```
