# Style And Conventions

Root Node app:
- CommonJS style (`require`, `module.exports`).
- Express route handlers in `server.js`; SQLite callbacks/promises mixed.
- Uses `bcryptjs`, `jsonwebtoken`, `helmet`, `cors`, `express-rate-limit`, `multer`, `sharp`, `dompurify`, `nodemailer`.
- Client code is large plain JavaScript in `script.js`, with many DOM template strings and global/window-accessible managers.
- CSS is plain CSS split across `styles.css` plus many fragrance profile CSS files.

Flutter app:
- Dart/Flutter with `provider`, `google_fonts`, `flutter_animate`, `video_player`, `cached_network_image` dependency declared.
- `flutter_lints` enabled through `analysis_options.yaml`.
- App state lives in `ChangeNotifier` providers for auth/cart/favorites.
- Product data is currently static Dart lists in `lib/data/`.

Important cautions:
- Worktree may already be dirty; do not revert unrelated changes.
- Avoid serving backend/source/runtime files from the static web root.
- Avoid `innerHTML`/template-string insertion for user-controlled content; prefer DOM nodes/textContent.
- Treat `.env` values as secrets and never reproduce actual values in responses.