# CleanHub — `backend`

Node (ESM) + **Express** HTTP API + **Prisma** ORM + **MySQL** (or MariaDB).

## Entry and source

- **`src/index.js`** — HTTP server: `/api/*` routes, optional static serving of `../frontend/dist` in production.
- **`src/`** — Auth middleware, user routes, order lifecycle helpers, garment prices config.
- **`prisma/schema.prisma`** — data model; **`prisma/seed.js`** — demo admin user; **`prisma/init.sql`** — optional hand-run SQL for DBeaver.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | API with **`node --watch`** (reload on file changes). |
| `npm start` | Run API once (no watch). |
| `npm run db:push` | Apply `schema.prisma` to the database (dev-friendly). |
| `npm run db:seed` | Seed demo admin (see root README). |
| `npm run db:studio` | Prisma Studio GUI. |
| `npm test` | Unit tests (e.g. order lifecycle helpers). |

## Environment

Copy **`.env.example`** to **`.env`** and set **`DATABASE_URL`** (MySQL connection string). Never commit `.env`.

## Deploy (typical)

1. Provision MySQL; run **`db:push`** (or migrations) and **`db:seed`** if you need the demo user.
2. Set `DATABASE_URL` (and `PORT` if needed) in the host environment.
3. Build the frontend at repo root (`npm run build`), then run production Node from repo root: **`npm run start:prod`** — serves API + static UI on one port — **or** run only this API and host the UI separately (set `VITE_API_URL` on the frontend build).
