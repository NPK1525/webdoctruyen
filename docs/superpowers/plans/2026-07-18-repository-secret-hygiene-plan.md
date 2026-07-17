# Repository Secret Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove publishable credentials and exclude local sensitive artifacts before committing and pushing the current source tree.

**Architecture:** Enforce repository hygiene with `.gitignore` and a source contract. Read optional seed passwords from ASP.NET configuration instead of literals, while retaining the ignored Development connection string locally.

**Tech Stack:** ASP.NET Core configuration, C#, Node.js built-in test runner, Git.

## Global Constraints

- Do not print secret values.
- Do not stage `.codex`, `App_Data`, database files, build output, or `appsettings.Development.json`.
- Push only after full verification and staged-content review.

### Task 1: Add a failing repository security contract

- [ ] Create `backend.Tests/js/repository-security-contract.test.cjs` asserting ignore rules, no password in tracked appsettings, and no literal `HashPassword` call in the seeder.
- [ ] Run the focused test and confirm it fails for the current repository state.

### Task 2: Sanitize repository configuration and seeding

- [ ] Extend `.gitignore` for local logs, keys, data, databases, and nested build output.
- [ ] Replace the tracked database string with a credential-free local default.
- [ ] Pass `builder.Configuration` into `MangaDbSeeder.Seed` and read both optional seed passwords from `SeedUsers` configuration.
- [ ] Run the focused test and confirm it passes.

### Task 3: Verify, stage, commit, and push

- [ ] Run all Node tests, JavaScript syntax checks, .NET tests, and Release build.
- [ ] Run a redacted secret scan and inspect all staged paths.
- [ ] Commit the safe source tree and push `master` to `origin`.
