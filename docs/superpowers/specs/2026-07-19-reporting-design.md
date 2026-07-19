# Manga and Chapter Reporting Design

## Goal

Provide authenticated users with report modals for manga details and chapter reading, store reports safely, and give administrators a single queue to review and resolve them.

## Scope

- Manga report reasons: Duplicate entry; Incorrect or missing volume numbers; Information to correct; Missing cover art; Other; Troll entry; Vandalism.
- Chapter report reasons: Credit page in the middle of the chapter; Duplicate upload from same user/group; Extraneous political/race-baiting/offensive content; Fake/Spam chapter; Group lock evasion; Images not loading; Incorrect chapter number; Incorrect group; Incorrect or duplicate pages; Incorrect or missing chapter title; Incorrect or missing volume number; Missing pages; Naming rules broken; Official release/Raw; Other; Pages out of order; Released before raws released; Uploaded on wrong manga; Watermarked images.
- Additional explanation is optional except for `Other`, where it is required; maximum 1,000 characters.
- Reports require a signed-in user. No Google reCAPTCHA is used; duplicate pending reports for the same target and reason are rejected.
- Admins can filter pending, resolved, and dismissed reports, inspect target/reporter/reason/explanation, and update status.

## Architecture

Use one `Report` entity with a target type (`Manga` or `Chapter`), nullable target foreign keys, reporter, reason, explanation, status, creation time, and resolution metadata. The API validates target ownership, reason membership, explanation rules, authentication, and duplicate pending reports. The detail page and reader reuse one report modal component with target-specific metadata and reason lists. An admin view consumes the same API and does not duplicate report storage logic.

## Data flow

1. User clicks Report on a manga detail or chapter reader.
2. Client opens the modal and fills target metadata and target-specific reasons.
3. Client submits a report with the selected reason and explanation.
4. API validates the authenticated user and target, rejects invalid/duplicate submissions, then stores `Pending`.
5. Admin loads the queue, filters by status/type, and changes status to `Resolved` or `Dismissed` with optional admin note.

## Error handling and security

- Unauthenticated submissions return an authentication error and open the existing login flow.
- Invalid reason, missing `Other` explanation, overlong explanation, missing target, and duplicate pending report return field-level messages.
- Only admins can list all reports or change status; reporters cannot modify other reports.
- User-supplied explanation and admin notes are HTML-escaped in all rendered views.

## Verification

- JavaScript contract tests cover reason lists, modal target binding, required `Other` explanation, and duplicate-submit handling.
- Backend tests cover creation, validation, duplicate pending protection, admin listing/status updates, and authorization.
- Existing JavaScript and backend test suites must remain green.
