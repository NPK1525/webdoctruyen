# Account Menu and Profile Cleanup Design

## Goal

Remove two redundant or user-inappropriate controls from the regular user interface:

1. The `Settings` link in the account dropdown, because it duplicates `My profile`.
2. The profile Badge display and Badge input, because badges are administered by administrators.

## Interface changes

- Remove the Settings link from the account dropdown.
- Keep the theme control and let it fill the available row width.
- Remove the Badge chip from the profile header.
- Remove the Badge input from the profile form.
- Stop profile JavaScript from reading, rendering, or submitting Badge values.

## Preserved behavior

- Keep the account role label such as `ADMIN`; it identifies authorization and is not the profile Badge.
- Keep Badge fields in admin user management.
- Keep Badge data and backend admin APIs unchanged.
- Keep reader settings unchanged.

## Verification

- Contract tests confirm the account dropdown has no Settings link.
- Profile tests confirm the regular profile view and payload contain no Badge control.
- Existing theme, profile, avatar, and admin-user tests continue to pass.
