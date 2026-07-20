# Password Reset by Email OTP

## Goal

Allow a signed-out user to reset a forgotten password by proving access to the email address registered on the account. The feature must fit the existing authentication modal and must not reveal whether an email address exists.

## User flow

1. The user selects **Quên mật khẩu** from the login view.
2. The user enters an email address and requests a code.
3. The server returns the same generic success response for known and unknown addresses. For a known, unlocked account, it emails a six-digit OTP.
4. The user enters the OTP. A successful verification returns a short-lived, single-use reset token.
5. The user enters and confirms a new password. The server validates it with the existing password policy, changes the password hash, consumes the reset request, and returns the user to login.

## Server design

### Persistence

Add a password-reset request entity containing:

- User identifier
- Hash of the OTP (never the plaintext OTP)
- Expiration timestamp
- Creation timestamp
- Last-sent timestamp
- Failed verification count
- Verified timestamp
- Hash of the reset token
- Reset-token expiration timestamp
- Consumed timestamp

Only the latest active request for a user is valid. Creating a new request invalidates older active requests.

### Endpoints

- `POST /api/auth/forgot-password` accepts an email address. It always returns a generic accepted response. A valid unlocked account receives an email unless the resend cooldown is active.
- `POST /api/auth/verify-reset-otp` accepts email and OTP. It rejects invalid, expired, consumed, or over-attempt requests and returns a cryptographically random reset token after successful verification.
- `POST /api/auth/reset-password` accepts email, reset token, new password, and confirmation. It validates the existing password policy, changes the hash, consumes the request, and clears existing sessions where practical within the current session architecture.

### Email delivery

Use an injectable SMTP email sender. Host, port, TLS setting, username, password, sender address, and sender name come from configuration/environment variables. Secrets are never committed. In development, an unconfigured sender produces a controlled service-unavailable response for a real account and never logs an OTP.

## Security rules

- OTP: six numeric digits generated with a cryptographic RNG.
- OTP lifetime: 10 minutes.
- Maximum failed OTP attempts: 5.
- Resend cooldown: 60 seconds.
- Reset token lifetime: 10 minutes, single-use, random, stored only as a SHA-256 hash.
- Forgot-password responses do not disclose account existence.
- OTP and reset-token comparisons use fixed-time equality.
- Passwords use the existing validation and BCrypt hashing service.
- Locked accounts cannot reset their password.
- Rate limiting is applied to the forgot-password and OTP verification endpoints using the application's existing rate-limit middleware.

## Client design

Extend the shared authentication modal with three views: request email, enter OTP, and choose a new password. Provide back navigation to login, loading/disabled states, clear errors, and Vietnamese text consistent with the current UI. The same shared modal keeps the flow available on every page that already supports login.

## Error handling

- Unknown email: generic accepted response, no email sent.
- SMTP unavailable for a known account: return a generic temporary-failure message without exposing configuration details.
- Invalid/expired OTP: show a concise error; increment the attempt count only for invalid OTPs.
- Too many attempts: require a new OTP.
- Invalid/expired reset token: require restarting the flow.
- Duplicate submissions are safe because consumed requests cannot be reused.

## Testing

- Unit/integration tests for generic account responses, OTP hashing and expiry, attempt limits, resend cooldown, token issuance, token expiry, single-use reset, password policy, locked users, and successful login with the new password.
- Architecture tests for the new endpoints, entity, migration, and injectable email service.
- Browser-facing static/JavaScript tests for all modal views, API calls, validation, and navigation.
- Run the complete JavaScript and .NET test suites and a clean build before completion.
