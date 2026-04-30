import { mergeHeaders } from "./sessionHeaders.js";

const API =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "";

function url(path) {
  return `${API}${path}`;
}

/** Avoid stale dashboard / list data from the HTTP cache (especially after mutations). */
const noStore = { cache: "no-store" };

/** Build a readable message from API JSON error bodies */
function apiErrorMessage(data, fallback) {
  const parts = [
    data?.error,
    data?.detail,
    data?.prismaCode && `Prisma ${data.prismaCode}`,
  ].filter(Boolean);
  return parts.length ? parts.join(" — ") : fallback;
}

export async function getDashboard() {
  const r = await fetch(url("/api/dashboard"), noStore);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getGarmentPrices() {
  const r = await fetch(url("/api/garment-prices"));
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function listOrders(params) {
  const u = new URLSearchParams();
  if (params.status) u.set("status", params.status);
  if (params.q) u.set("q", params.q);
  if (params.garment) u.set("garment", params.garment);
  const r = await fetch(url(`/api/orders?${u.toString()}`), noStore);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createOrder(body) {
  const r = await fetch(url("/api/orders"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(apiErrorMessage(data, r.statusText));
  return data;
}

export async function updateOrderStatus(id, status) {
  const body = JSON.stringify({ status });
  const headers = { "Content-Type": "application/json" };
  const path = url(`/api/orders/${encodeURIComponent(id)}/status`);
  /** PATCH is the primary handler in this repo; POST is only for environments that return 405 on PATCH. */
  let r = await fetch(path, {
    method: "PATCH",
    headers,
    body,
    cache: "no-store",
  });
  if (r.status === 405) {
    r = await fetch(path, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(apiErrorMessage(data, r.statusText));
  return data;
}

/** Set ETA (ISO string) or clear with null */
export async function updateOrderEta(id, estimatedDeliveryDate) {
  const r = await fetch(url(`/api/orders/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estimatedDeliveryDate }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(apiErrorMessage(data, r.statusText));
  return data;
}

/** Admin only */
export async function deleteOrder(id) {
  const r = await fetch(url(`/api/orders/${id}`), {
    method: "DELETE",
    headers: mergeHeaders(),
  });
  if (r.status === 204) return;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(apiErrorMessage(data, r.statusText));
}

/** Auth & users (stored in MySQL via Prisma) */
export async function authLogin(username, password) {
  const r = await fetch(url("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(apiErrorMessage(data, r.statusText));
  return data;
}

/** Public sign-up (no admin headers). */
export async function authRegister(body) {
  const r = await fetch(url("/api/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(apiErrorMessage(data, r.statusText));
  return data;
}

export async function listUsers() {
  const r = await fetch(url("/api/users"), { headers: mergeHeaders() });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(apiErrorMessage(data, r.statusText));
  return data;
}

export async function createUser(body) {
  const r = await fetch(url("/api/users"), {
    method: "POST",
    headers: mergeHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(apiErrorMessage(data, r.statusText));
  return data;
}

export async function updateUser(id, body) {
  const r = await fetch(url(`/api/users/${id}`), {
    method: "PATCH",
    headers: mergeHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(apiErrorMessage(data, r.statusText));
  return data;
}

export async function deleteUser(id) {
  const r = await fetch(url(`/api/users/${id}`), { method: "DELETE", headers: mergeHeaders() });
  if (r.status === 204) return;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(apiErrorMessage(data, r.statusText));
}
