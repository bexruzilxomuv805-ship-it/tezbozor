# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**TezBozor** (repo/folder name "Oziq-ovqat") — a React + Vite grocery ordering storefront with a customer shop and an admin panel, in Uzbek/Russian/English. The brand name "TezBozor" lives in `T.*.appName` in [src/i18n/translations.js](src/i18n/translations.js) — update it there (all three languages) if it changes again, not in the folder name.

## Commands

```bash
npm run dev      # Vite dev server only, http://localhost:5176
npm start         # Full dev stack: kills known dev ports, then runs Vite + two json-server instances concurrently
npm run build      # vite build -> dist/
npm run preview     # Preview production build, port 4173
npm run lint       # oxlint
```

There is no test suite configured in this repo.

`npm start` is the normal way to develop, since the app expects the JSON API backend to be running:
- `json-server --watch db.json --port 4000` — products, users, and orders (`/products`, `/users`, `/orders`)

`prestart` (Windows/PowerShell only) force-kills anything listening on ports 4000, 4102, 5173-5176 before `start` runs, to avoid stale json-server/Vite processes blocking startup.

## Architecture

**Single global state, no Redux/Zustand.** All app state — products, cart, orders, auth, language, toasts — lives in one context: [src/context/AppContext.jsx](src/context/AppContext.jsx), exposed via the `useApp()` hook. Every page/component that needs data or mutations pulls from this context rather than fetching directly.

**Single backend.** Products, users, and orders are all served by one json-server instance (`db.json`) via a single `API_BASE` (`:4000` in dev, `VITE_API_BASE` env var in production, defaulting to `/api` outside dev). Until 2026-08-21 this was split across two json-server processes (`db.main.json`/`db.orders.json` on :4100/:4101 with separate `API_BASE`/`ORDERS_BASE`); it was consolidated into one file/port for simplicity — image uploads still go through their own small server (`upload-server.js`, port 4102, see below).

**Local-first, server-optional.** `AppContext` initializes `products`/`cart`/`orders`/`currentUser` from `localStorage` first, then tries to fetch fresher data from the json-server backend and overwrites state on success. Every mutation (`addProduct`, `updateProduct`, `deleteProduct`, `checkout`, `deleteOrder`, `cancelOrder`, `removeOrderItem`) updates local state optimistically first and fires a best-effort `fetch(...).catch(() => {})` to persist server-side — network/server failures are silently swallowed so the app keeps working offline against localStorage. Follow this same optimistic-update + fire-and-forget-persist pattern when adding new mutations.

**Image uploads.** [upload-server.js](upload-server.js) is a tiny standalone Node http server (port 4102, `VITE_UPLOAD_BASE` in production) that writes uploaded product images to `public/uploads/` and also serves them back directly by filename — it does not rely on Vite's dev-server static passthrough, which only picks up files present in `public/` at startup and can 404 on files written after the server started. [src/components/ProductEditor.jsx](src/components/ProductEditor.jsx) stores the absolute upload-server URL for newly uploaded images for this reason.

**Firebase functions backend is scaffolded, not implemented.** [functions/](functions/) only contains a `package.json` describing an intended Firebase Functions (Express + firebase-admin) backend for products/users/orders — there is no `index.js` or actual implementation yet. The active backend in dev is json-server against `db.json`, not Firebase.

**i18n via a plain object, not a library.** [src/i18n/translations.js](src/i18n/translations.js) exports `T` keyed by language (`uz`, `ru`, `en`, see `LANGS`); `AppContext` derives `t = T[lang]` and puts it on the context. Some values are functions (e.g. `inStock: (n) => ...`) for interpolation. Product names/categories carry their own `{ uz, ru, en }` objects (see [src/data/products.js](src/data/products.js)) rather than translation keys — display code must index by `lang` directly for those.

**Units/pricing.** Products have a `baseUnit` (`kg`, `l`, or `dona`/piece). [src/utils/units.js](src/utils/units.js) provides `unitOptions(baseUnit)` (the buyable quantity choices, e.g. 1kg/500g/250g), `optionFactor()` (converts a chosen option to a multiple of the base unit for stock decrement math), and `formatMoney()` (locale-aware currency formatting per language). Cart items store a `factor` and `unitPrice` computed from these at add-to-cart time; `checkout()` uses `factor * qty` to decrement `product.stock`.

**Routing** ([src/App.jsx](src/App.jsx)): customer-facing routes use Uzbek path segments (`/dokon` = shop, `/savat` = cart, `/buyurtma-qabul-qilindi/:orderId` = order success). Admin routes are nested under `/admin` (also Uzbek segments: `mahsulotlar` = products, `buyurtmalar` = orders, `foydalanuvchilar` = users) inside `AdminLayout`. There is no route-level auth guard currently wired in — `currentUser`/role checks happen inside components/context, not via a router guard.

**Styling** is Tailwind CSS v4 (via `@tailwindcss/vite`, no separate config file) plus CSS custom properties for the color palette (e.g. `var(--gc-cream)`, defined in [src/index.css](src/index.css)).

**Linting** is oxlint (not ESLint), configured in [.oxlintrc.json](.oxlintrc.json) with `react` and `oxc` plugins; `react/rules-of-hooks` is an error.
