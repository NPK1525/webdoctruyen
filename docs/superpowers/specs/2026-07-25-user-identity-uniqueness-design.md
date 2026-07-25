# User Identity Uniqueness Design

## Goal

Prevent duplicate usernames and email addresses across registration, login, password reset, seed, and admin user editing, with database-enforced uniqueness and clear user-facing errors.

## Scope

- Add persisted `NormalizedUsername` and `NormalizedEmail` fields to `User`.
- Normalize by trimming and applying invariant uppercase before comparisons and saves.
- Add unique database indexes for both normalized fields.
- Update registration, login, password-reset lookup, and admin profile editing to use normalized fields.
- Catch SQL Server duplicate-key errors and return a clear username/email conflict message.
- Preserve existing data: migrations stop with a diagnostic error if normalized duplicates already exist; they never delete or rename accounts automatically.

## Data Model and Migration

`User.NormalizedUsername` is limited to the same maximum length as the validated username (24 characters). `User.NormalizedEmail` is limited to 256 characters.

The migration will:

1. Add the two columns with a temporary safe default for existing rows.
2. Populate them from trimmed, invariant-uppercase values of the existing `Username` and `Email` columns.
3. Detect duplicate normalized values and throw a descriptive migration error before creating indexes.
4. Create unique indexes `IX_Users_NormalizedUsername` and `IX_Users_NormalizedEmail`.
5. Remove the temporary default after backfill.

The migration must be rerunnable through the normal EF Core migration workflow and must not alter or delete duplicate rows.

## Application Behavior

`MangaDbContext` will normalize `User` entities on add and update so every write path remains consistent. Controllers will still perform an early normalized lookup for fast validation.

- Registration rejects an existing normalized username or email with a validation response.
- Login accepts the original display casing but queries normalized username/email.
- Password reset locates users by normalized email.
- Admin profile editing applies the same checks while excluding the user being edited.
- A duplicate-key exception caused by a race is mapped to the matching friendly conflict message instead of a 500 response.

## Error Handling

SQL Server error numbers 2601 and 2627 will be recognized from `DbUpdateException`. The conflicting index name/message determines whether the response is for username or email. Unknown database errors continue through the existing server-error path.

## Testing

- Model metadata tests verify both normalized properties and unique indexes.
- Context tests verify normalization on insert/update.
- Registration tests cover casing/whitespace duplicates for username and email.
- Admin tests cover duplicate username and email while editing another user.
- Source/architecture tests verify login and password reset use normalized fields and duplicate-key handling exists.
- Full JavaScript and .NET test suites must remain green.

## Non-Goals

- No automatic account merging, deletion, or renaming.
- No change to display casing shown in the UI; `Username` and `Email` remain the display values.
- No new external identity provider or email-verification flow in this change.
