# Preserve Existing Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent clean JavaScript modules from replacing page-owned sidebar markup.

**Architecture:** Keep HTML/Razor as the visual source of truth. Retain the shared JavaScript renderer only as a fallback for an empty drawer.

**Tech Stack:** JavaScript, Node.js built-in test runner, ASP.NET Core Razor.

## Global Constraints

- Preserve current HTML, CSS, colors, spacing, and responsive behavior.
- Do not change admin, Title Draft, chapter upload, authentication, or database behavior.
- Do not commit the dirty working tree.

---

### Task 1: Protect page-owned sidebar markup

**Files:**
- Modify: `backend.Tests/js/common-auth-contract.test.cjs`
- Modify: `backend/wwwroot/js/common.js`

**Interfaces:**
- Consumes: `renderUnifiedSidebarDrawer()` and `#sidebar-drawer`.
- Produces: a fallback-only renderer that does not mutate non-empty drawers.

- [ ] **Step 1: Write the failing source contract**

Assert that `renderUnifiedSidebarDrawer()` checks `drawer.children.length > 0` before assigning `innerHTML`.

- [ ] **Step 2: Run the focused test and verify RED**

Run `node --test backend.Tests/js/common-auth-contract.test.cjs` and require failure at the new preservation assertion.

- [ ] **Step 3: Implement the minimal guard**

Add `if (drawer.children.length > 0) return;` immediately after the existing null guard.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run `node --test backend.Tests/js/common-auth-contract.test.cjs` and require all tests to pass.

### Task 2: Verify no regressions

**Files:**
- Verify only.

**Interfaces:**
- Consumes: the guarded renderer.
- Produces: test and browser evidence that the existing interface remains intact.

- [ ] **Step 1: Run all JavaScript tests.**
- [ ] **Step 2: Run all backend tests.**
- [ ] **Step 3: Build the backend in Release with zero errors.**
- [ ] **Step 4: Open a static page, record a distinctive existing sidebar element before startup, and verify it remains after startup.**
