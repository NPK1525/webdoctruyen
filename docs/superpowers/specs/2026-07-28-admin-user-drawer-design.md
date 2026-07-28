# Admin User Editing Drawer Design

## Goal

Allow an administrator to view and edit a user without leaving the **Quản lý người dùng** tab in `/admin`. The existing search text, filters, pagination, and scroll position must remain intact while the editor is open.

## User Experience

- Replace the current **Xem / Chỉnh sửa** navigation link with a button that opens a drawer from the right side of the Admin Control Panel.
- Keep the user list visible behind a dimmed overlay.
- The drawer contains:
  - avatar preview;
  - username and email;
  - role, badge, avatar URL, and biography;
  - lock or unlock action;
  - save-profile action;
  - administrator password-reset form.
- Closing the drawer returns directly to the unchanged user list.
- A successful save or lock change refreshes the edited row and summary without resetting search, filters, or pagination.
- The drawer shows loading, validation, API-error, and success states inside the current admin visual system.

## Architecture

- Add the drawer markup to `Views/AdminView/Index.cshtml` so it is part of the existing Admin Control Panel shell.
- Extend `admin-users.js` to own drawer opening, closing, user loading, profile saving, lock toggling, and password resetting.
- Reuse the existing admin user API endpoints:
  - `GET /api/admin/users/{id}`
  - `PUT /api/admin/users/{id}`
  - `PUT /api/admin/users/{id}/lock`
  - `PUT /api/admin/users/{id}/password`
- Continue using `apiFetch`, so unsafe requests retain CSRF protection.
- Add drawer-specific styles to the shared stylesheet using the existing theme variables.
- Keep `/admin/users/{id}` and its current view as a compatible direct URL; the primary list action no longer navigates there.

## State and Data Flow

1. The administrator clicks **Xem / Chỉnh sửa**.
2. The drawer opens in a loading state and requests the selected user.
3. The response populates the forms and avatar preview.
4. Saving sends the existing update request.
5. On success, the current user-list page reloads in place and the drawer reflects the saved values.
6. Lock changes update both the drawer state and the corresponding list row.
7. Password reset clears only the password form after success.

Only one user can be open at a time. Closing the drawer clears the selected user ID and transient messages.

## Accessibility and Responsive Behavior

- The drawer uses dialog semantics, an accessible label, and a close button.
- `Escape` closes it.
- Clicking the overlay closes it; clicking inside the drawer does not.
- Keyboard focus moves into the drawer when opened and returns to the triggering button when closed.
- On small screens the drawer occupies the full viewport width and remains vertically scrollable.
- Buttons are disabled while their request is in progress to prevent duplicate submissions.

## Error Handling

- A missing or deleted user shows a visible error and leaves the list usable.
- Validation messages remain human-readable, including duplicate username/email and invalid HTTPS avatar URL.
- A failed save, lock change, or password reset does not close the drawer or discard entered values.
- The current administrator cannot lock their own account, matching existing server behavior.

## Testing

- Add a UI contract test proving the list action opens the drawer instead of linking away.
- Verify required drawer fields, actions, accessibility attributes, and responsive styles.
- Verify the JavaScript uses the existing endpoints through `apiFetch`.
- Verify successful mutations refresh the current list without resetting its state.
- Run the complete Node test suite, backend test suite, and Release build.

## Out of Scope

- Removing the existing `/admin/users/{id}` compatibility page.
- Changing user API contracts or database schema.
- Adding bulk user editing.
- Changing administrator authorization rules.
