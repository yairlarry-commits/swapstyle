# SwapStyle

Clothes-swapping app: swap clothes you no longer wear for something new.

- **Live app:** https://yairlarry-commits.github.io/swapstyle/
- The files at the top of this repository are the ready-to-serve app (GitHub Pages serves them as they are).
- `source/` is the full source code (React + Vite + Tailwind + Supabase). See `source/README.md`.
- `source/supabase/` holds the database setup and updates (run `migration_002` and `migration_003` once in Supabase → SQL Editor).

## Android app

`android/` is a small Android app that opens https://yairlarry-commits.github.io/swapstyle/ full screen,
with camera and photo-picking support. `.github/workflows/android.yml` builds a signed `SwapStyle.apk`
(install on a phone) and `SwapStyle.aab` (Google Play) on every change to `android/`, and publishes them
under **Releases**. It needs the `SIGNING_KEY` secret (base64 of the signing keystore). Keep a copy of the
keystore: Google Play updates must be signed with the same key.
