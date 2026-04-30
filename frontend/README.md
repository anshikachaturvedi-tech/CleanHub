# CleanHub — `frontend`

React 18 + Vite. All UI code lives under **`src/`**. API calls go through **`src/api.js`** (relative `/api/...` in dev, or `VITE_API_URL` when set).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server (default port **5173**), proxies `/api` to the backend (see `vite.config.js`). |
| `npm run build` | Production bundle into **`dist/`**. |
| `npm run preview` | Local preview of the built `dist/` (optional). |

## Environment

Copy **`.env.example`** to **`.env`** if you need a full API base URL (e.g. UI on CDN, API on another host). Variable: **`VITE_API_URL`** (no trailing slash). Leave unset in local dev to use same-origin `/api` via the Vite proxy.

## Deploy (typical)

1. From repo root: `npm run build` (builds this workspace).
2. Host **`dist/`** on any static host **or** let the Node app in `../backend` serve it when `NODE_ENV=production` (see root `README.md`, `start:prod`).
3. Ensure the browser can reach the API (same origin, reverse proxy, or `VITE_API_URL` baked in at build time).
