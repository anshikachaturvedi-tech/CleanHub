import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { PrismaClient, Prisma } from "@prisma/client";
import { DEFAULT_GARMENT_PRICES } from "./prices.js";
import { createRequireAdmin } from "./authMiddleware.js";
import { registerUserRoutes } from "./usersRoutes.js";
import { defaultEstimatedDeliveryFromNow } from "./orderLifecycle.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Node does not load .env by itself; Prisma CLI does. Load backend/.env from this file’s location.
dotenv.config({ path: path.join(__dirname, "..", ".env") });

/** Avoid res.json() throwing on non-JSON-safe fields (e.g. Prisma meta). */
function sendJson(res, status, obj) {
  try {
    res.status(status).type("application/json").send(JSON.stringify(obj));
  } catch {
    res
      .status(status)
      .type("application/json")
      .send(JSON.stringify({ error: obj?.error ?? "Error", detail: "Could not serialize error body" }));
  }
}

const prisma = new PrismaClient();
const requireAdmin = createRequireAdmin(prisma);
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

/** Configurable default prices (also used by UI) */
app.get("/api/garment-prices", (_req, res) => {
  res.json({ prices: DEFAULT_GARMENT_PRICES });
});

/** Dashboard aggregates (status counts reflect DB as stored — no auto-overwrite of status here) */
app.get("/api/dashboard", async (_req, res) => {
  try {
    const [count, revenueAgg, byStatus] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);
    const ordersByStatus = {};
    for (const s of ["RECEIVED", "PROCESSING", "READY", "DELIVERED"]) {
      ordersByStatus[s] = 0;
    }
    for (const r of byStatus) {
      ordersByStatus[r.status] = r._count._all;
    }
    res.json({
      totalOrders: count,
      totalRevenue: revenueAgg._sum.totalAmount ?? 0,
      ordersByStatus,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

/** List with filters: ?status= &q= (name/phone) &garment= */
app.get("/api/orders", async (req, res) => {
  const { status, q, garment } = req.query;
  const where = {};
  if (status && String(status).length) {
    const upper = String(status).toUpperCase();
    if (!["RECEIVED", "PROCESSING", "READY", "DELIVERED"].includes(upper)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    where.status = upper;
  }
  if (q && String(q).trim()) {
    const term = String(q).trim();
    where.OR = [
      { customerName: { contains: term } },
      { phone: { contains: term } },
    ];
  }
  if (garment && String(garment).trim()) {
    const g = String(garment).trim();
    where.lines = { some: { garmentType: { contains: g } } };
  }
  try {
    const orders = await prisma.order.findMany({
      where,
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ orders });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list orders" });
  }
});

/** Single order */
app.get("/api/orders/:id", async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { lines: true },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ order });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get order" });
  }
});

function parseItems(body) {
  const { items } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "items must be a non-empty array" };
  }
  const lines = [];
  let total = 0;
  for (const row of items) {
    const garmentType = String(row.garmentType ?? "").trim();
    const quantity = Number(row.quantity);
    const pricePerItem = Number(row.pricePerItem);
    if (!garmentType) return { error: "Each item needs garmentType" };
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { error: "quantity must be a positive integer" };
    }
    if (!Number.isFinite(pricePerItem) || pricePerItem < 0) {
      return { error: "pricePerItem must be a non-negative number" };
    }
    const lineTotal = quantity * pricePerItem;
    total += lineTotal;
    lines.push({ garmentType, quantity, pricePerItem });
  }
  return { lines, total };
}

/** Create order — returns id + total + lines */
app.post("/api/orders", async (req, res) => {
  const { customerName, phone, estimatedDeliveryDate, items } = req.body;
  if (!customerName || !String(customerName).trim()) {
    return res.status(400).json({ error: "customerName is required" });
  }
  if (!phone || !String(phone).trim()) {
    return res.status(400).json({ error: "phone is required" });
  }
  const parsed = parseItems({ items });
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  let est = null;
  if (estimatedDeliveryDate) {
    const d = new Date(estimatedDeliveryDate);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ error: "Invalid estimatedDeliveryDate" });
    }
    est = d;
  } else {
    est = defaultEstimatedDeliveryFromNow();
  }
  try {
    // Two-step write avoids rare MySQL + nested-create issues; still one transaction.
    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          customerName: String(customerName).trim(),
          phone: String(phone).trim(),
          status: "PROCESSING",
          totalAmount: parsed.total,
          estimatedDeliveryDate: est,
        },
      });
      for (const l of parsed.lines) {
        await tx.orderLine.create({
          data: {
            orderId: o.id,
            garmentType: l.garmentType,
            quantity: l.quantity,
            pricePerItem: l.pricePerItem,
          },
        });
      }
      return tx.order.findUnique({
        where: { id: o.id },
        include: { lines: true },
      });
    });
    res.status(201).json({
      orderId: order.id,
      totalBillAmount: order.totalAmount,
      order,
    });
  } catch (e) {
    console.error(e);
    const detail =
      typeof e?.message === "string" && e.message
        ? e.message
        : typeof e === "string"
          ? e
          : e != null
            ? String(e)
            : "Unknown error";
    const body = {
      error: "Failed to create order",
      detail,
    };
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      body.prismaCode = e.code;
    }
    sendJson(res, 500, body);
  }
});

/** Update status — registered before PATCH /api/orders/:id so paths with /status are never ambiguous. */
async function handleOrderStatusUpdate(req, res) {
  const { status } = req.body;
  const upper = String(status ?? "").toUpperCase();
  if (!["RECEIVED", "PROCESSING", "READY", "DELIVERED"].includes(upper)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: upper },
      include: { lines: true },
    });
    res.json({ order });
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ error: "Order not found" });
    }
    console.error(e);
    res.status(500).json({ error: "Failed to update status" });
  }
}

app.patch("/api/orders/:id/status", handleOrderStatusUpdate);
app.post("/api/orders/:id/status", handleOrderStatusUpdate);

/** Update estimated delivery (ISO string or null to clear) — any signed-in client may call (same as list/create). */
app.patch("/api/orders/:id", async (req, res) => {
  if (!Object.prototype.hasOwnProperty.call(req.body, "estimatedDeliveryDate")) {
    return res.status(400).json({ error: "estimatedDeliveryDate required (ISO string or null to clear)" });
  }
  const raw = req.body.estimatedDeliveryDate;
  let est = null;
  if (raw !== null && raw !== "") {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ error: "Invalid estimatedDeliveryDate" });
    }
    est = d;
  }
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { estimatedDeliveryDate: est },
      include: { lines: true },
    });
    res.json({ order });
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ error: "Order not found" });
    }
    console.error(e);
    res.status(500).json({ error: "Failed to update order" });
  }
});

/** Admin only — cascades delete order lines */
app.delete("/api/orders/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.order.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ error: "Order not found" });
    }
    console.error(e);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

registerUserRoutes(app, prisma, requireAdmin);

if (process.env.NODE_ENV === "production") {
  const dist = path.join(__dirname, "../../frontend/dist");
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => {
    if (req.method !== "GET") return res.status(404).json({ error: "Not found" });
    res.sendFile(path.join(dist, "index.html"));
  });
} else {
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
}

async function start() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Prisma: database connection OK.");
  } catch (e) {
    console.error("Prisma: database connection FAILED — check backend/.env DATABASE_URL and that MySQL is running.");
    console.error(e?.message ?? e);
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Laundry API listening on http://127.0.0.1:${PORT} (and localhost)`);
  });
  server.on("error", (err) => {
    if (err?.code === "EADDRINUSE") {
      console.error(
        `\nPort ${PORT} is already in use. Another process (often an old \`npm run dev\`) is holding it.\n` +
          `Free it:  ss -tlnp | grep :${PORT}   then   kill <PID>\n` +
          `Or use another port:  PORT=3002 npm run dev --workspace=backend\n`
      );
    } else {
      console.error(err);
    }
    process.exit(1);
  });
}

start();
