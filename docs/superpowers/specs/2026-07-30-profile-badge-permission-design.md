# Profile Badge Permission Design

## Goal

Prevent a signed-in user from assigning or changing their own badge through
`PUT /api/userprofile/me`. Badge management remains available only through the
existing admin user-management endpoint.

## API Design

- Remove `Badge` from `UpdateProfileDto`.
- Remove the badge assignment from `UserProfileController.UpdateMyProfile`.
- Continue returning `Badge` in profile responses so the UI can display a badge
  assigned by an administrator.
- Keep `Badge` in the admin user-management request and response contracts.
- An extra `Badge` property sent to the profile endpoint is ignored by the
  default JSON input formatter and cannot reach the persistence assignment.

## Authorization Boundary

The profile endpoint may update only user-owned profile fields such as biography
and avatar. The existing admin endpoint remains the sole write path for badges
and continues to require its current administrator authorization.

## Tests

- Add a contract test asserting that `UpdateProfileDto` does not expose a
  writable `Badge` property.
- Add a regression test proving an existing badge is unchanged when a user
  updates other profile fields.
- Keep existing admin user-management tests to verify administrators can still
  update badges.

## Out of Scope

- Changing how badges are displayed.
- Adding a badge catalog or badge validation rules.
- Modifying roles or other administrator permissions.
