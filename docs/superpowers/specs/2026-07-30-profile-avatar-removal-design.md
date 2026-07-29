# Profile Avatar Removal Design

## Goal

Allow users to remove their current avatar without accidentally clearing it
when an API client updates another profile field.

## Request Semantics

`PUT /api/userprofile/me` interprets `AvatarUrl` as follows:

- A non-empty HTTPS URL replaces the current avatar.
- An empty or whitespace-only string clears the current avatar and stores
  `null`.
- A JSON `null` value or an omitted `avatarUrl` property leaves the current
  avatar unchanged.

The existing HTTPS validation and 2,048-character limit remain unchanged.

## Frontend Behavior

The profile form sends the trimmed avatar input directly. Clearing the input
therefore sends an empty string instead of converting it to `null`. After a
successful save, the existing avatar synchronization updates the header,
dropdown, profile preview, and locally cached user data to use the fallback
avatar.

## Backend Behavior

`UserProfileController.UpdateMyProfile` checks whether `AvatarUrl` is non-null.
When present, it converts blank text to `null`; otherwise it trims and stores
the validated HTTPS URL. A null DTO value performs no avatar write.

## Tests

- A blank avatar string clears an existing avatar.
- A null avatar value preserves an existing avatar while another profile field
  is updated.
- HTTPS avatar updates and invalid URL rejection continue to work.
- The profile frontend sends the empty string without `|| null`.

## Out of Scope

- Uploading image files.
- Changing avatar URL validation.
- Changing administrator avatar management.
- Changing badge editing or display.
