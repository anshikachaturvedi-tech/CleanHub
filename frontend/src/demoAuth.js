/**
 * Session in localStorage; users live in MySQL (see /api/users, /api/auth/login).
 * Demo admin is seeded — credentials shown on the auth screen.
 */

import { authLogin } from "./api.js";

export const DEMO_ADMIN = {
  username: "admin",
  password: "cleanhub",
};

const SESSION_KEY = "cleanhub_session";

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s?.user) return null;
    return { user: s.user, role: s.role || "user", userId: s.userId || null };
  } catch {
    return null;
  }
}

function writeSession({ user, role, userId }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, role, userId }));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/** @returns {Promise<{ ok: true } | { ok: false, error: string }>} */
export async function login(username, password) {
  const u = String(username || "").trim();
  const p = String(password || "");
  if (!u || !p) return { ok: false, error: "Enter username and password." };
  try {
    const { user } = await authLogin(u, p);
    writeSession({ user: user.username, role: user.role, userId: user.id });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Login failed" };
  }
}
