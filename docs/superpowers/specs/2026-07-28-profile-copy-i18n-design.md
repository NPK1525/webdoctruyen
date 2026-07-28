# Profile Copy and Back Button Translation Design

## Goal

Simplify the profile form by removing three helper lines and make the home-return button follow the selected Vietnamese or English locale.

## Scope

- Remove the helper text below the email, avatar URL, and badge fields.
- Keep the email field read-only and keep the HTTPS/2,048-character avatar validation unchanged.
- Add `profile.backHome` to both locale dictionaries.
- Attach `data-i18n="profile.backHome"` to a text-only element inside the existing home-return link so the arrow icon remains intact.

## Verification

- A JavaScript contract test confirms the helper copy is absent.
- The same test confirms both locale dictionaries contain `profile.backHome`.
- The same test confirms the button uses the translation key without replacing its icon.

