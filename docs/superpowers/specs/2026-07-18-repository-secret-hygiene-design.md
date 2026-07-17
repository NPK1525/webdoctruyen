# Repository Secret Hygiene Design

## Goal

Make the current repository safe to publish without breaking the developer's local SQL Express setup.

## Design

Ignore Codex logs, ASP.NET Data Protection keys, local application data, database files, and build output at every project depth. Keep the working `appsettings.Development.json` local and ignored. Replace the tracked connection string with a Windows-authenticated local default that contains no password.

Remove literal seed passwords from source. `MangaDbSeeder` receives `IConfiguration` and creates the optional `admin` and `demo` accounts only when `SeedUsers:AdminPassword` and `SeedUsers:DemoPassword` are supplied through Development settings, User Secrets, or environment variables. Existing databases are unchanged because seeding only runs when there are no users.

Before commit, run a regression contract, full tests/build, a secret-pattern scan, inspect the staged file list, then push to `origin/master`. Never stage ignored local data or secrets.
