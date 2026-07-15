# Codebase Cleanup Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Thiết lập baseline, kiểm tra encoding và quy tắc file cho toàn codebase mà không thay đổi giao diện hoặc hành vi.

**Architecture:** Dùng test xUnit để quét UTF-8/mojibake và một báo cáo Markdown tái tạo được để ghi nhận entry point/file lớn/file trùng. Thêm `.editorconfig` chỉ áp dụng cho thay đổi sau này, không chạy format hàng loạt.

**Tech Stack:** .NET 10, xUnit, PowerShell, Node.js, ASP.NET Core/Razor/vanilla JavaScript.

## Global Constraints

- Giữ nguyên giao diện và API/DOM contract.
- Không xóa file tĩnh hoặc migration trong giai đoạn 1.
- Không format hàng loạt.
- Bỏ qua `bin`, `obj`, `.git`, runtime data và uploads khi quét.
- Mọi kết luận phải có lệnh kiểm tra tái tạo được.

---

### Task 1: Create reproducible codebase baseline

**Files:**
- Create: `docs/quality/codebase-baseline.md`
- Create: `tools/codebase-baseline.ps1`

- [ ] Write a PowerShell script that lists source entry points, files over 500 lines, duplicate static filenames, layout/view script and stylesheet references, and exact verification commands.
- [ ] Run the script and save its deterministic output to the baseline document.
- [ ] Review the report manually; label duplicates as candidates only, never as safe-to-delete.
- [ ] Re-run the script and confirm no repository files are modified outside the report.

### Task 2: Add UTF-8 and mojibake regression tests

**Files:**
- Create: `backend.Tests/SourceEncodingTests.cs`
- Modify: `backend.Tests/EncodingRegressionTests.cs` only to share non-production scanning rules if needed

- [ ] Write failing tests that strictly decode source text as UTF-8 and report file paths for known mojibake patterns in user-visible source.
- [ ] Run `dotnet test backend.Tests/MangaNPK.Tests.csproj -c Release --filter FullyQualifiedName~SourceEncodingTests --no-restore` and record the expected failing files.
- [ ] Implement focused allow/ignore rules for generated/runtime folders, then fix only the reported user-visible mojibake strings in source files.
- [ ] Re-run filtered and full backend tests until they pass.

### Task 3: Add repository editor rules without mass formatting

**Files:**
- Create or Modify: `.editorconfig`

- [ ] Add UTF-8, final newline, trailing-whitespace and indentation rules documented in the design.
- [ ] Verify `git diff --stat` shows no mechanical rewrite of existing source files.
- [ ] Validate newly created quality/test files against the rules.

### Task 4: Run complete phase-1 verification

**Files:**
- Modify: `docs/quality/codebase-baseline.md` with final verification evidence

- [ ] Run Release backend tests and build.
- [ ] Run `node --check` for every JavaScript source outside generated/runtime folders.
- [ ] Run every `backend.Tests/js/*.test.cjs` test.
- [ ] Run strict UTF-8 decoding over the scanned file extensions.
- [ ] Record database/browser smoke-test limitations separately; do not mark them passed when LocalDB or the development port is unavailable.
- [ ] Confirm no intentional visual or API changes occurred in phase 1.

## Self-review

- The plan covers every phase-1 requirement from the approved roadmap.
- No deletion, mass formatting or behavior change is authorized.
- All commands and file paths are explicit and reproducible.

