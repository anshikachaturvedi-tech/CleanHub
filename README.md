# CleanHub — Mini laundry order management

Dry-cleaning style order flow: create orders (customer, phone, line items with per–garment price), track **RECEIVED → PROCESSING → READY → DELIVERED**, list with filters, and a small **dashboard** (count, revenue, counts per status).

- **UI:** React (Vite) — tabbed **Dashboard**, **New order**, **Orders**
- **API:** Node.js (Express) + **Prisma** + **MySQL** (suits DBeaver, a real server, and production; you can also use MariaDB)
- **Extras implemented:** default garment **price list** (configurable in code + API), **search by garment type** on the order list, **estimated delivery date** per order, **Postman** collection

---

## Repository layout (frontend vs backend)

This project is an **npm workspaces** monorepo: two packages at the repo root, no shared application code between them (the browser talks to the API over HTTP).

| Location | Role | What to deploy |
|----------|------|----------------|
| **`frontend/`** | **Frontend** — React (Vite), runs in the browser | Build output: **`frontend/dist/`** after `npm run build`. Optionally set `VITE_API_URL` when the API is on another origin (see `frontend/.env.example`). |
| **`backend/`** | **Backend** — Node (Express) + Prisma + MySQL | Run **`backend/src/index.js`** with `DATABASE_URL` set. In production with `NODE_ENV=production`, the same process can also **serve** `frontend/dist` (see `npm run start:prod` at repo root). |

**Useful paths (not exhaustive):**

```text
cleanhub/
├── package.json          # root scripts: dev, build, start:prod, db:*
├── frontend/             # FRONTEND workspace
│   ├── src/              # React app (App.jsx, AuthPages, api.js, styles, …)
│   ├── index.html
│   ├── vite.config.js    # dev proxy: /api → API port
│   └── dist/             # created by `npm run build` (static assets)
├── backend/              # BACKEND workspace
│   ├── src/              # Express app (index.js, routes, auth, order lifecycle)
│   ├── prisma/           # schema.prisma, seed.js, init.sql
│   ├── .env.example      # DATABASE_URL template (copy to .env)
│   └── .env              # local secrets (gitignored)
└── README.md
```

Root **`node_modules/`** holds hoisted dependencies for workspaces; **`frontend/node_modules`** / **`backend/node_modules`** may appear for tooling. **Do not commit** `.env` files or secrets.

More detail: **`frontend/README.md`** (UI build and env) and **`backend/README.md`** (API, database, Prisma).

---

## Setup (local)

**Requirements:** Node **16.14+** (Node **18+** recommended; assignment CI may use 18+).

1. **Clone and install**

   ```bash
   git clone <your-repo-url> cleanhub
   cd cleanhub
   cp backend/.env.example backend/.env
   npm install
   ```

2. **Create / sync the database** (MySQL or MariaDB 5.7+ / 8+)

   1. Start **MySQL** and create a user with access to a database named **`cleanhub`** (or use `root` for local dev only).
   2. Copy `cp backend/.env.example backend/.env` and set:

      ```env
      DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/cleanhub"
      ```

   **Option A — You run SQL in DBeaver (or any client)** — good for the assignment write-up

   - New **MySQL** connection in DBeaver to your server; open an **SQL script** and run `backend/prisma/init.sql` (it creates `cleanhub` and tables **`Order`**, **`OrderLine`**, **`User`**).
   - Ensure **`backend/.env`** matches host, port, user, password, and database **`cleanhub`**.

   **Option B — Prisma creates tables from `schema.prisma`**

   ```bash
   npm run db:push
   ```

   If the database **`cleanhub`** does not exist yet, create it once (`CREATE DATABASE cleanhub;`) then run `db:push`.

   **Seed the demo admin user** (required for login: `admin` / `cleanhub`):

   ```bash
   npm run db:seed
   ```

   Then generate the client (if you have not already):

   ```bash
   cd backend && npx prisma generate && cd ..
   ```

   *(Run `generate` after changing providers or schema.)*

3. **Run in development (API + Vite, with proxy to API)**

   ```bash
   npm run dev
   ```

   - API: <http://localhost:3001>
   - UI: <http://localhost:5173> (proxies `/api` → 3001)

4. **Production-style single process (optional)** — build the frontend, then serve the API + static UI on one port:

   ```bash
   npm run build
   npm run start:prod
   ```

   Open <http://localhost:3001>. The Express app serves `frontend/dist` when `NODE_ENV=production`.

---

## Features implemented

| Feature | Notes |
|--------|--------|
| Create order | Name, phone, one or more garment lines (type, quantity, **price per item**), optional **estimated delivery** |
| **Total + order id** | Response includes `orderId` (UUID), `totalBillAmount` (₹) |
| Status flow | `RECEIVED` → `PROCESSING` → `READY` → `DELIVERED` — **click badge** or “Set status” in the list |
| List + filters | **Status**, **name/phone** substring, **garment** substring (any line) |
| Dashboard | Total orders, total **revenue** (sum of `totalAmount` on all orders), **orders per status** (zeros filled in) |
| Garment price defaults | `GET /api/garment-prices` and `backend/src/prices.js` (same list as UI dropdown) |
| **Users (CRUD)** | MySQL `User` model; **Users** tab and `/api/users*` are **admin-only**. The login screen has **no public sign-up**; new accounts are created by an admin (Users tab) or via **`POST /api/auth/register`** if you call the API directly. |

**Skipped (by design, keep scope small):** real JWTs, payments, email/SMS, print receipts. Role checks use **headers + DB lookup** suitable for a demo, not for production.

**With more time:** PostgreSQL in prod, real migrations (`prisma migrate`), price table in DB, role-based access, tests (Jest/Playwright), and deploy (Render/Railway) with managed DB.

---

## API (quick reference)

| Method | Path | |
|--------|------|---|
| `GET` | `/api/health` | liveness |
| `GET` | `/api/garment-prices` | default prices map |
| `GET` | `/api/dashboard` | `totalOrders`, `totalRevenue`, `ordersByStatus` (counts match stored rows; status is not auto-changed on this request) |
| `GET` | `/api/orders?status=&q=&garment=` | list; `q` = name or phone contains |
| `GET` | `/api/orders/:id` | one order with lines |
| `POST` | `/api/orders` | body: `customerName`, `phone`, `items[]` (`garmentType`, `quantity`, `pricePerItem`), optional `estimatedDeliveryDate` (ISO) |
| `PATCH` or `POST` | `/api/orders/:id/status` | body: `{ "status": "READY" }` etc. (the web app uses PATCH; POST on 405 only). Restart the API after pulling so both methods are registered. |
| `POST` | `/api/auth/login` | body: `{ "username", "password" }` → `{ user }` (includes `id` for session headers) |
| `POST` | `/api/auth/register` | optional API-only registration: `username`, `password`, optional profile fields → creates `role: user` (not exposed in the app UI) |
| `GET` | `/api/users` | list users — **admin only** (requires `X-Cleanhub-User-Id` header = DB user id with `role: admin`) |
| `POST` | `/api/users` | admin creates user — same body as register — **admin only** |
| `GET` | `/api/users/:id` | one user — **admin only** |
| `PATCH` | `/api/users/:id` | update — **admin only** |
| `DELETE` | `/api/users/:id` | delete (blocked for seeded `admin`) — **admin only** |
| `DELETE` | `/api/orders/:id` | delete order (cascades lines) — **admin only** |

**Demo auth headers:** After login, the UI sends `X-Cleanhub-User-Id` (and username/role) on admin routes. The server re-checks the database row is `admin`. This is for the assignment only, not production security.

Import **`postman/CleanHub.postman_collection.json`** into Postman. Set the `base` variable to your host (e.g. `http://localhost:3001`).

**React → API in dev:** Vite proxy; for a separate browser origin, set in `frontend` a `.env` with `VITE_API_URL=http://localhost:3001` (optional — empty uses same origin with proxy when using `npm run dev`).

**Status field:** `Order.status` is stored as a **string** (four allowed values). You could switch to a MySQL `ENUM` later in pure SQL; Prisma here keeps it simple and validates in the API.

---

## Tradeoffs

- **MySQL** matches tools like **DBeaver**, behaves like production, and avoids SQLite-specific limits.
- **String status** keeps Prisma portable; the API enforces the four workflow values.
- **UI** uses a small set of tabs (including **Users** CRUD); not a router-heavy SPA.
- **No tests** in this timebox; API was smoke-tested manually and with Postman.
- **Public GitHub link:** you must create the remote repository and `git push` (no account access from this environment).

---

## AI usage report (fill in for your submission)

*You are required to document use of AI tools. Replace the sample bullets with your own.*

**Tools used e.g.:** ChatGPT, Cursor, GitHub Copilot, …

**Where AI helped (examples of prompts you can use / adapt):**

- *“Scaffold a Node Express API with Prisma 5, MySQL, Order + OrderLine models, REST create/list/patch, no ORM abstractions past Prisma.”*
- *“Add React Vite app with a dashboard and table filters for status, customer, garment.”*
- *“Add estimated delivery to orders and a garment price map shared by API and UI.”*

**What the model got wrong (examples — be honest in your own report):**

- First suggestions may pick **SQLite** for a quick demo; for **DBeaver + real SQL** the project uses **MySQL** and a hand-run `init.sql`.
- Suggested **Node 18+ Prisma 6** while a machine still runs **Node 16** — the fix was pinning **Prisma 5.22** and Vite 4, or **upgrading Node to 20 LTS**.

**What you changed manually or reviewed:**

- Final schema, API error handling, UI layout/CSS, and README/Postman. Always **run** `npm run db:push` and a quick **curl/Postman** after codegen.

---

## Repository layout

```
cleanhub/
├── frontend/               # Vite + React
├── backend/
│   ├── prisma/schema.prisma
│   ├── src/index.js         # API + static (production)
│   └── src/prices.js
├── postman/
│   └── CleanHub.postman_collection.json
└── package.json            # `npm run dev` from root
```

### Public GitHub link (you)

After you push, replace this section with: **Repository:** `https://github.com/<user>/<repo>`

### Demo

- Loom/screen recording of **create order → list → change status → dashboard** (optional), or
- This README + Postman = sufficient per many rubrics; add screenshots if the assignment requires them.

---

## License

MIT (or your org’s default) — set as needed for the course.
