# CleanHub — Mini Laundry Order Management System

> **Assignment submission** — AI-First Full Stack Development Task  
> **Live Demo:** [https://backend-production-93f6.up.railway.app](https://backend-production-93f6.up.railway.app)  
> **Stack:** React 18 (Vite 4) · Node.js (Express) · Prisma 5 · MySQL · Railway

---

## Table of Contents

1. [Features Implemented](#features-implemented)
2. [Project Structure](#project-structure)
3. [Setup Instructions (Local)](#setup-instructions-local)
4. [Deployment Guide (Railway)](#deployment-guide-railway)
5. [API Reference](#api-reference)
6. [Default Garment Prices](#default-garment-prices)
7. [Postman Collection](#postman-collection)
8. [AI Usage Report](#ai-usage-report)
9. [Tradeoffs & Future Improvements](#tradeoffs--future-improvements)

---

## Features Implemented

### Core (Required)

| Feature | Status | Notes |
|--------|--------|-------|
| Create order — name, phone, garments, qty, price | ✅ | Supports multiple garment line items per order |
| Unique Order ID + total bill amount | ✅ | UUID primary key; total calculated server-side in ₹ |
| Status flow: RECEIVED → PROCESSING → READY → DELIVERED | ✅ | New orders default to `PROCESSING`; click badge or "Set Status" in UI |
| Update order status | ✅ | `PATCH /api/orders/:id/status` |
| List all orders | ✅ | Table view with all order details and line items |
| Filter by status | ✅ | Dropdown filter on orders list |
| Filter by customer name / phone | ✅ | Substring search via `?q=` |
| Dashboard — total orders, total revenue, orders per status | ✅ | All four statuses always shown (zeros filled in) |

### Bonus (Optional — All Implemented)

| Bonus Feature | Status | Notes |
|--------------|--------|-------|
| React frontend (Vite 4) | ✅ | Tabbed UI: Dashboard, New Order, Orders, Users |
| Authentication + admin roles | ✅ | Login required; admin routes protected via DB role check |
| MySQL database with Prisma ORM | ✅ | Models: `Order`, `OrderLine`, `User` |
| Search by garment type | ✅ | `?garment=` filter — searches across all line items |
| Estimated delivery date | ✅ | Auto-set if omitted; editable via `PATCH /api/orders/:id` |
| Deployed on Railway | ✅ | Single service: API + React static files |

---

## Project Structure

This is an **npm workspaces monorepo**. Frontend and backend are separate packages that communicate over HTTP.

```
cleanhub/
├── package.json                        # Root scripts: dev, build, start:prod, db:*
├── package-lock.json
├── .gitignore
├── README.md
│
├── backend/
│   ├── src/
│   │   ├── index.js                    # Express entry: all API routes + static file serving (production)
│   │   ├── prices.js                   # Default garment price list (₹), also served via GET /api/garment-prices
│   │   ├── authMiddleware.js           # requireAdmin — re-validates X-Cleanhub-User-Id against DB
│   │   ├── usersRoutes.js              # Admin-only CRUD routes for /api/users
│   │   └── orderLifecycle.js           # defaultEstimatedDeliveryFromNow() helper
│   ├── prisma/
│   │   ├── schema.prisma               # Order, OrderLine, User models (MySQL, Prisma 5)
│   │   ├── seed.js                     # Creates admin user: username=admin, password=cleanhub
│   │   └── init.sql                    # Raw SQL alternative — run manually in DBeaver
│   ├── .env.example                    # DATABASE_URL template
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                     # All pages in a tabbed layout
│   │   └── api.js                      # All fetch calls to the backend
│   ├── index.html
│   ├── vite.config.js                  # Dev proxy: /api → localhost:3001
│   ├── .env.example                    # VITE_API_URL (optional, for separate-origin deploys)
│   ├── package.json
│   └── README.md
│
└── postman/
    └── CleanHub.postman_collection.json
```

---

## Setup Instructions (Local)

### Prerequisites

- **Node.js 16.14+** (Node 18 LTS recommended)
- **MySQL 5.7+ or 8+** (or MariaDB)
- **Git**

### Step 1 — Clone & Install

```bash
git clone https://github.com/anshikachaturvedi-tech/CleanHub.git
cd cleanhub
npm install
```

This installs dependencies for both the `frontend` and `backend` workspaces from the root.

### Step 2 — Configure Environment

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and set your MySQL connection string:

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/cleanhub"
```

### Step 3 — Create the Database

Run this once in MySQL to create the database:

```sql
CREATE DATABASE cleanhub;
```

Then create the tables using one of these two options:

**Option A — DBeaver (or any SQL client):**

1. Open your MySQL connection in DBeaver
2. Open a new SQL Script tab
3. Run the file `backend/prisma/init.sql` — creates `Order`, `OrderLine`, and `User` tables

**Option B — Prisma CLI:**

```bash
npm run db:push
```

### Step 4 — Generate Prisma Client

```bash
cd backend && npx prisma generate && cd ..
```

Run this once after setup, and again any time `schema.prisma` changes.

### Step 5 — Seed the Admin User

```bash
npm run db:seed
```

This creates the default login account:

| Username | Password |
|----------|----------|
| `admin` | `cleanhub` |

### Step 6 — Start the App

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend (React + Vite) | http://localhost:5173 |
| Backend (Express API) | http://localhost:3001 |

Vite's dev server proxies all `/api` requests from port 5173 to 3001 automatically — no CORS setup needed locally.

---

## Deployment Guide (Railway)

In production, a single Railway service runs Express, which serves both the API routes and the compiled React frontend.

### Architecture

```
Railway Service (Node.js)
  └── Express — listens on $PORT (assigned by Railway)
        ├── /api/*   →  API routes (orders, dashboard, auth, users)
        └── /*       →  Serves frontend/dist/index.html (React build)
```

### Step 1 — Push Your Code to GitHub

```bash
git add .
git commit -m "initial commit"
git push origin main
```

### Step 2 — Create a Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project → Deploy from GitHub repo**
3. Select your repository

### Step 3 — Add a MySQL Database

1. Inside the Railway project, click **New → Database → MySQL**
2. Railway provisions the instance and exposes `DATABASE_URL` as an environment variable automatically

### Step 4 — Set Environment Variables

In Railway service → **Settings → Variables**, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Auto-set by the Railway MySQL plugin — no action needed |
| `NODE_ENV` | `production` |

### Step 5 — Set the Start Command

In Railway service → **Settings → Deploy**, set the **Start Command** to:

```bash
npm run start:prod
```

This command builds the React frontend first, then starts Express. With `NODE_ENV=production`, Express serves `frontend/dist` as static files alongside the API.

### Step 6 — Run Database Setup (One-time)

Open the Railway service shell and run:

```bash
npm run db:push
npm run db:seed
```

`db:push` syncs `schema.prisma` to the Railway MySQL instance. `db:seed` creates the admin user.

### Step 7 — Done

Your app is live at the URL Railway assigns:

**[https://backend-production-93f6.up.railway.app](https://backend-production-93f6.up.railway.app)**

---

## API Reference

**Production:** `https://backend-production-93f6.up.railway.app`  
**Local:** `http://localhost:3001`

---

### Health

| Method | Endpoint | Response |
|--------|----------|----------|
| `GET` | `/api/health` | `{ "ok": true }` |

---

### Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/orders` | Logged in | Create a new order |
| `GET` | `/api/orders` | Logged in | List orders (with optional filters) |
| `GET` | `/api/orders/:id` | Logged in | Get one order with all line items |
| `PATCH` | `/api/orders/:id/status` | Logged in | Update order status |
| `PATCH` | `/api/orders/:id` | Logged in | Update estimated delivery date |
| `DELETE` | `/api/orders/:id` | Admin only | Delete order (cascades to line items) |

**Query filters for `GET /api/orders`:**

| Param | Description |
|-------|-------------|
| `?status=PROCESSING` | Filter by exact status value |
| `?q=riya` | Substring match on customer name or phone |
| `?garment=saree` | Substring match on garment type across line items |

**Create Order — Request Body:**

```json
{
  "customerName": "Riya Sharma",
  "phone": "9876543210",
  "estimatedDeliveryDate": "2025-06-10T00:00:00.000Z",
  "items": [
    { "garmentType": "Shirt",  "quantity": 2, "pricePerItem": 800  },
    { "garmentType": "Saree",  "quantity": 1, "pricePerItem": 2000 }
  ]
}
```

`estimatedDeliveryDate` is optional — omit it and the API sets a sensible default automatically.  
New orders are always created with status `PROCESSING`.

**Create Order — Response `201`:**

```json
{
  "orderId": "b3d2f1a0-...",
  "totalBillAmount": 3600,
  "order": { "...": "full order object with lines" }
}
```

**Update Status — Request Body:**

```json
{ "status": "READY" }
```

Valid values: `RECEIVED` · `PROCESSING` · `READY` · `DELIVERED`

---

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard` | Returns totals and per-status counts |

**Response:**

```json
{
  "totalOrders": 12,
  "totalRevenue": 48000,
  "ordersByStatus": {
    "RECEIVED": 3,
    "PROCESSING": 4,
    "READY": 2,
    "DELIVERED": 3
  }
}
```

All four statuses are always present — zeros filled in for statuses with no orders.

---

### Garment Prices

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/garment-prices` | Returns the default price map used in the UI dropdown |

---

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | `{ username, password }` → returns user object |
| `POST` | `/api/auth/register` | API-only; creates a `role: user` account |

After login the UI sends `X-Cleanhub-User-Id` in request headers. The server re-queries the database to validate the role on every admin-protected route.

---

### Users (Admin Only)

Requires header: `X-Cleanhub-User-Id: <admin-user-id>`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Create a user |
| `GET` | `/api/users/:id` | Get one user |
| `PATCH` | `/api/users/:id` | Update a user |
| `DELETE` | `/api/users/:id` | Delete a user (seeded `admin` is protected) |

---

## Default Garment Prices

Defined in `backend/src/prices.js` and served via `GET /api/garment-prices`. The same list populates the garment dropdown in the New Order form.

| Garment | Price (₹) |
|---------|-----------|
| Shirt | ₹800 |
| Pants | ₹1,000 |
| Saree | ₹2,000 |
| Suit | ₹800 |
| Dress | ₹1,500 |
| Jacket | ₹2,500 |
| T-Shirt | ₹600 |

To change prices, edit `backend/src/prices.js` and restart the server.

---

## Postman Collection

Import `postman/CleanHub.postman_collection.json` into Postman.

Set the collection variable `base` before running:

| Environment | Value |
|-------------|-------|
| Local | `http://localhost:3001` |
| Production | `https://backend-production-93f6.up.railway.app` |

The collection has pre-built requests for every endpoint with example request bodies.

---

## AI Usage Report

### Tools Used

- **Claude (Anthropic)** — primary tool for scaffolding, schema design, API logic, React UI, deployment config
- **GitHub Copilot** — inline completions during manual edits

---

### Where AI Helped

| Area | What AI Did |
|------|-------------|
| Monorepo scaffold | Generated npm workspaces structure with separate frontend/backend packages and root scripts |
| Prisma schema | Produced `Order`, `OrderLine`, `User` models with correct relations and `onDelete: Cascade` |
| Express routes | Scaffolded all endpoints — list with filters, create with `parseItems()` validation, status patch, dashboard aggregates |
| `parseItems()` helper | Generated per-item validation loop (garmentType, integer quantity, non-negative price) with running total |
| React UI | Built tabbed layout with Dashboard, New Order form (dynamic line items), Orders table (filters), and Users CRUD |
| `seed.js` | Generated admin upsert with `bcryptjs` password hashing |
| `authMiddleware.js` | Scaffolded `requireAdmin` with DB role re-validation on every request |
| Production deploy | Suggested Express static-file serving pattern for single-service Railway deployment |

---

### Sample Prompts Used

```
"Scaffold a Node Express API with Prisma 5, MySQL, Order + OrderLine models.
REST endpoints: create order, list with filters (status/name/garment), patch status,
dashboard aggregates. Validate items in a parseItems() helper. No extra abstractions."
```

```
"Add a React Vite frontend with three tabs: Dashboard (totals + status counts),
New Order form (dynamic garment line items with price dropdown from API), and
Orders table (status/name/garment filters). Dev proxy /api to localhost:3001."
```

```
"Add estimated delivery date to create order — auto-set via
defaultEstimatedDeliveryFromNow() if the client omits it. Expose
PATCH /api/orders/:id to update it later."
```

```
"Add a garment price map in prices.js, serve it via GET /api/garment-prices,
and use the same data to populate the New Order dropdown."
```

---

### Where AI Got It Wrong

| Issue | What Happened | What I Fixed |
|-------|--------------|--------------|
| Database choice | AI defaulted to SQLite for quick prototyping | Switched to MySQL to match DBeaver + production requirements |
| Node / Prisma version | Suggested Prisma 6 + Vite 5, broke on Node 16 | Pinned Prisma 5.22 and Vite 4; upgraded to Node 18 |
| Status route method | Generated only `POST` for the status update | Added `PATCH` as primary; kept `POST` as fallback — both registered |
| Default order status | AI set new orders to `RECEIVED` | Changed to `PROCESSING` — matches real dry-cleaning workflow where items go straight to processing |
| Auth approach | Suggested full JWT with refresh tokens | Simplified to `X-Cleanhub-User-Id` header + DB role re-check — right-sized for demo scope |
| Prisma nested create | Used nested `create` inside transaction | Split into explicit two-step write inside `$transaction` to avoid known MySQL + Prisma nested-create edge cases |
| Error serialization | `res.json()` threw on non-JSON-safe Prisma error objects | Wrapped in a `sendJson()` helper that catches serialization failures gracefully |

---

### What I Reviewed and Changed Manually

- Prisma schema field names, types, and relation constraints
- API error handling — correct HTTP status codes, `sendJson()` wrapper for Prisma error safety
- `parseItems()` edge cases — non-integer quantity, negative price, empty garmentType
- Production static-file serving path (`../../frontend/dist` relative to `src/index.js`)
- Railway start command and environment variable wiring
- This README

---

## Tradeoffs & Future Improvements

### What I Skipped (by design, to keep scope small)

| Skipped | Reason |
|---------|--------|
| JWT authentication | Demo scope — header + DB role re-check is sufficient and much simpler |
| Payment integration | Out of scope |
| Email / SMS notifications | Not required |
| Print receipts | No requirement |
| Automated tests | No time in 72-hour window; all endpoints tested manually with Postman |
| `prisma migrate` (formal migrations) | Used `db:push` for speed; fine for a demo |

### What I Would Improve With More Time

- **PostgreSQL** on a managed service (Supabase / PlanetScale) for better production reliability
- **Prisma Migrate** instead of `db:push` for safe, versioned schema changes in a team
- **Price table in DB** — let store admins configure prices without a code change
- **Centralized RBAC middleware** instead of per-route role checks
- **Jest unit tests** for `parseItems()` and API route handlers
- **Playwright E2E tests** — create order → change status → verify dashboard updates
- **Loom screen recording** — quick walkthrough of the full order flow
