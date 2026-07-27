# Task Completion Checklist

For root Node/static changes:
- Run targeted manual or API checks for changed endpoints/UI.
- Run `npm audit --omit=dev` after dependency changes.
- There is currently no root `npm test`/lint script; add or run targeted checks when possible.
- If DB schema changes, verify fresh DB initialization with `npm run init-db` and ensure server routes match that schema.

For Flutter changes:
- Run `flutter analyze` in `charme_app/`.
- Run `flutter test` in `charme_app/`.
- Verify navigation/state changes manually where tests do not exist.

General:
- Inspect `git status --short --untracked-files=all` before finalizing.
- Do not commit secrets, runtime DBs, uploads, or local tool config unless intentionally requested.
- If touching auth, XSS, file uploads, or DB schema, add/regress tests where feasible and verify failure modes.