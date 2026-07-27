# Project Overview

Charme is a mixed repository containing a root Node/Express + static frontend perfume website and a Flutter mobile app under `charme_app/`.

Root app:
- `server.js` is the Express API/server entrypoint.
- `index.html`, `script.js`, `styles.css`, `js/`, and `css/` contain the static web frontend.
- `services/emailService.js` handles Nodemailer verification/welcome email.
- SQLite runtime data lives under `database/` and uploads under `uploads/`, both ignored by git.
- `scripts/init-database.js` is the package `init-db` script, but there is also a separate `database/init-database.js` with a different schema.

Flutter app:
- `charme_app/lib/main.dart` defines the app shell and bottom tabs.
- `charme_app/lib/screens/` contains screens.
- `charme_app/lib/providers/` contains Provider state for auth/cart/favorites.
- `charme_app/lib/data/` contains in-code fragrance datasets.
- `charme_app/test/widget_test.dart` is the current test file.

Primary concerns found during onboarding/deep audit: public serving from repo root, auth/session gaps, stored XSS paths, DB schema drift, frontend performance hotspots, failing Flutter smoke test, and dependency vulnerabilities.