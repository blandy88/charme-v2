# Suggested Commands

Root Node/static app:
- `npm install` or `npm ci` to install dependencies.
- `npm start` to run `node server.js`.
- `npm run dev` to run `nodemon server.js`.
- `npm run init-db` to initialize the SQLite DB via `scripts/init-database.js`.
- `npm audit --omit=dev` to audit production dependencies.
- `npm outdated` to check stale npm dependencies.

Flutter app (`charme_app/`):
- `flutter pub get` to install Dart/Flutter dependencies.
- `flutter analyze` to run static analysis.
- `flutter test` to run tests.
- `flutter pub outdated` to check stale Flutter dependencies.
- `flutter run` to run the app on a device/emulator.

Repo hygiene:
- `git status --short --untracked-files=all` to inspect working tree state.
- Use PowerShell on Windows; prefer quoted paths with spaces and the `workdir` parameter for commands.