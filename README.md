# TezBozor

## Deploy (Vercel + Render)

The frontend and backend deploy to separate free-tier hosts. The site's visible domain is
whatever Vercel assigns — visitors never see or visit the Render URLs, those are only called
in the background by `fetch`.

**1. Backend — two Render Web Services, both pointing at this repo's `main` branch:**

| Service | Build Command | Start Command |
|---|---|---|
| API (products/orders/users) | `npm install` | `npm run start:api` |
| Image uploads | `npm install` | `npm run start:upload` |

Both need the **Free** instance type. Note: Render's free tier has an ephemeral disk — images
uploaded through the admin panel after deploy are lost on every restart/redeploy. The seed
product images in `public/uploads/` are unaffected since they ship as part of the Vercel
build, not the Render disk.

**The API service stores its data in MongoDB Atlas, not on Render's disk** — this matters
because Render's free tier restarts the service from a fresh copy of the repo whenever it
spins down from inactivity, which used to silently wipe any product/order/account added after
the last deploy (`db.json` reset to whatever was last committed to git). `server.js` replaced
`json-server` for exactly this reason. It needs one environment variable:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/tezbozor_prod?retryWrites=true&w=majority
```

Get this from MongoDB Atlas (a separate free account — Atlas's M0 cluster tier is free
forever, no card/trial expiry) → Database → Connect → Drivers, then add `/tezbozor_prod`
before the `?` in the connection string to target that database explicitly. Also add
`0.0.0.0/0` under Network Access → IP Access List so Render (which has no fixed IP on the
free tier) can reach the cluster — the username/password still guards the actual data.
`db.json` is no longer read by anything at runtime; it's kept only as a historical seed
reference. Local development uses a separate `tezbozor_dev` database (see `.env.local`,
gitignored) so local testing never touches real data.

**2. Frontend — import this repo into Vercel**, then set these Environment Variables
*before* the first deploy (Vite bakes them into the build, so setting them after a build
requires redeploying):

```
VITE_API_BASE=https://<your-api-service>.onrender.com
VITE_UPLOAD_BASE=https://<your-upload-service>.onrender.com
```

`vercel.json` in this repo rewrites every path to `/index.html` — without it, deep links like
`/admin/mahsulotlar` or a hard refresh on any non-root route 404, since React Router only
handles routing once the app has already loaded and Vercel otherwise looks for a matching
static file.

If the assigned `<name>.vercel.app` domain is already taken by someone else's project,
Vercel appends a suffix (`-one`, etc.) automatically — add a custom `vercel.app` subdomain
under Project Settings → Domains if you want a specific name instead.

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
