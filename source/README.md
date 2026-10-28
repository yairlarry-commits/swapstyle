# SwapStyle

A copy of the SwapStyle clothes-swapping app (swapstyle-clothing-e-bxvt.bolt.host), rebuilt as readable source code.
React 18 + Vite + Tailwind CSS + Supabase.

## Run it

```bash
npm install
npm run dev
```

Open the address Vite prints (usually http://localhost:5173).

## Data

- `.env` points at your existing Supabase project, so it uses the same users and items as the live site.
- Delete the two lines in `.env` to run in **demo mode**: no server, everything saved in the browser, with sample items.
- `supabase/schema.sql` recreates the tables, security rules and the "mark items swapped on accept" trigger in a new Supabase project.

## Where things are

| File | What it is |
| --- | --- |
| `src/App.jsx` | App shell, loading screen, error screen, screen switching |
| `src/screens/AuthScreen.jsx` | Create account / Sign in |
| `src/screens/FeedScreen.jsx` | Feed with category chips and filters |
| `src/screens/ItemScreen.jsx` | Item page + "Offer a swap" sheet |
| `src/screens/UploadScreen.jsx` | Add an item form |
| `src/screens/CameraFlow.jsx` | Camera → position → background removal |
| `src/screens/OffersScreen.jsx` | Incoming / sent swap requests |
| `src/screens/ProfileScreen.jsx` | Closet, stats, edit profile |
| `src/components/ui.jsx` | Button, Logo, Avatar, cards, sheet, bottom nav |
| `src/lib/api.js` | All database calls |
| `src/lib/constants.js` | Categories, sizes, conditions, labels |
| `src/lib/imageClean.js` | In-browser background removal |
| `src/lib/sounds.js` | Notification chimes |
| `tailwind.theme.js` | Colors (ink, sand, sage, accent, gold), fonts, shadows |

## Build for hosting

```bash
npm run build
```

Upload the `dist/` folder to any static host (Netlify, Vercel, Cloudflare Pages, Bolt, etc.).

## Languages

Hebrew (right-to-left) is the default, English is a switch on the sign-in screen and in your closet.
Screens are written in English; `src/lib/i18n.js` holds the Hebrew. Every text that reaches the screen
passes through `src/i18n/jsx-runtime.js`, so a new string only needs a Hebrew line in `i18n.js`.
