# Profile Copy and Back Button Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove redundant profile helper copy and translate the home-return button in Vietnamese and English.

**Architecture:** Keep the existing static profile page and locale loader. Add one locale key to each JSON dictionary and bind only the button text span, preserving the existing icon and link behavior.

**Tech Stack:** HTML, JSON locale dictionaries, Node.js built-in test runner.

## Global Constraints

- Do not weaken the read-only email rule.
- Do not weaken HTTPS-only avatar validation or its 2,048-character limit.
- Keep the existing return link, icon, styles, and destination.

---

### Task 1: Profile copy and translation contract

**Files:**
- Create: `backend.Tests/js/profile-copy-i18n.test.cjs`
- Modify: `backend/wwwroot/profile.html`
- Modify: `backend/wwwroot/locales/vi.json`
- Modify: `backend/wwwroot/locales/en.json`

**Interfaces:**
- Consumes: Existing `I18N.apply()` support for `data-i18n`.
- Produces: Locale key `profile.backHome`.

- [ ] **Step 1: Write the failing test**

Assert that the three helper sentences are absent, the back-button text uses `data-i18n="profile.backHome"`, and both locale files define the correct translations.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test backend.Tests/js/profile-copy-i18n.test.cjs`

Expected: FAIL because the helper copy remains and `profile.backHome` does not exist.

- [ ] **Step 3: Write minimal implementation**

Remove the three `<small>` elements, wrap only the return-link text in `<span data-i18n="profile.backHome">`, and add:

```json
"profile.backHome": "Quay lại trang chủ"
```

to Vietnamese plus:

```json
"profile.backHome": "Back to home"
```

to English.

- [ ] **Step 4: Run focused and full tests**

Run:

```text
node --test backend.Tests/js/profile-copy-i18n.test.cjs
node --test backend.Tests/js
```

Expected: All tests pass.

- [ ] **Step 5: Verify formatting**

Run: `git diff --check`

Expected: No whitespace errors.

