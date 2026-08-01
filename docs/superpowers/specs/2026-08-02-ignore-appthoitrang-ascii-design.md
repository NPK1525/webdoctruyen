# Ignore `appthoitrang_ascii` Design

## Goal

Stop the unrelated root-level `appthoitrang_ascii/` directory from appearing as untracked content in the WebDocTruyen repository.

## Change

Add this root-scoped rule to `.gitignore`:

```gitignore
/appthoitrang_ascii/
```

The leading slash limits the rule to the repository root. The trailing slash makes it directory-only.

## Safety

- Do not delete or modify files inside `appthoitrang_ascii/`.
- Do not untrack any currently tracked WebDocTruyen files.
- Keep all existing `.gitignore` rules unchanged.

## Verification

Run `git status --short` and confirm `appthoitrang_ascii/` no longer appears while unrelated tracked changes remain visible.
