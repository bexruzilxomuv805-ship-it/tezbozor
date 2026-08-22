# TezBozor

## Deploy (Vercel + Render)

The frontend and backend deploy to separate free-tier hosts. The site's visible domain is
whatever Vercel assigns — visitors never see or visit the Render URLs, those are only called
in the background by `fetch`.

**1. Backend — two Render Web Services, both pointing at this repo's `main` branch:**

| Service | Build Command | Start Command |
|---|---|---|
| API (products/orders/users) | `npm install` | `npm run start:api` |
| Image uploads + push notifications | `npm install` | `npm run start:upload` |

Both need the **Free** instance type. Note: Render's free tier has an ephemeral disk — images
uploaded through the admin panel after deploy are lost on every restart/redeploy. The seed
product images in `public/uploads/` are unaffected since they ship as part of the Vercel build,
not the Render disk.

The **Image uploads** service also sends order-status push notifications (see "Push
notifications" below) and needs these environment variables:

```
API_BASE=https://<your-api-service>.onrender.com
VAPID_PUBLIC_KEY=<generated below>
VAPID_PRIVATE_KEY=<generated below>
VAPID_SUBJECT=mailto:you@example.com
```

**2. Frontend — import this repo into Vercel**, then set these Environment Variables
*before* the first deploy (Vite bakes them into the build, so setting them after a build
requires redeploying):

```
VITE_API_BASE=https://<your-api-service>.onrender.com
VITE_UPLOAD_BASE=https://<your-upload-service>.onrender.com
VITE_VAPID_PUBLIC_KEY=<same public key as VAPID_PUBLIC_KEY above>
```

`vercel.json` in this repo rewrites every path to `/index.html` — without it, deep links like
`/admin/mahsulotlar` or a hard refresh on any non-root route 404, since React Router only
handles routing once the app has already loaded and Vercel otherwise looks for a matching
static file.

If the assigned `<name>.vercel.app` domain is already taken by someone else's project,
Vercel appends a suffix (`-one`, etc.) automatically — add a custom `vercel.app` subdomain
under Project Settings → Domains if you want a specific name instead.

## Push notifications

Customers can opt in on their Profile page to get a real device notification when an admin
changes their order's status (preparing/delivering/delivered/cancelled). No Firebase or paid
service involved — it's the standard Web Push API, sent by `upload-server.js`'s `/notify` route
using the `web-push` package, with subscriptions stored in `db.json`'s `pushSubscriptions`
collection (same json-server as everything else).

A VAPID key pair (needed once, shared across all environments) was generated for this project:

```
VAPID_PUBLIC_KEY=BGHxti6o_Tg0wcoIkf9xhCPZRDaDjp3f2L7l8JkmSAEoWr4Dy05dStFCd5Vb02aLsqoJRlEGGt1HazkKxl33uvQ
VAPID_PRIVATE_KEY=-eeoSm_gPIdqLPNd2Hyv6-WyhGAQ9Pf0kT3U07vWgVE
```

Put `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`/`API_BASE` on the **Image uploads**
Render service, and `VITE_VAPID_PUBLIC_KEY` (same value as `VAPID_PUBLIC_KEY`) on Vercel. Keep
these keys — regenerating them invalidates every customer's existing subscription (they'd need
to click "Enable notifications" again).

iOS Safari only supports this on 16.4+, and only once the site has been added to the home
screen — that's an Apple platform limitation, not something fixable here.

## PWA

`vite-plugin-pwa` (configured in `vite.config.js`) generates the manifest and service worker
at build time, so the site is installable to a phone's home screen and its app shell still
loads offline. `public/icon-192.png`, `icon-512.png`, and `apple-touch-icon.png` are the T/B
mark from `logo-icon.png` re-composited on a solid `--gc-cream` background — the original is
transparent, which iOS renders as solid black behind a home-screen icon. Regenerate them with
`sharp` (`npm install --no-save sharp`) if the logo changes: trim the transparent padding,
composite centered on `#fbf8f1` at ~62% of the canvas size for maskable-safe padding.

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
