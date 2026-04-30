/** Headers for admin-only API calls (must match server authMiddleware). */
const SESSION_KEY = "cleanhub_session";

export function actorHeaders() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const s = JSON.parse(raw);
    if (!s?.userId) return {};
    return {
      "X-Cleanhub-User-Id": s.userId,
      "X-Cleanhub-Username": String(s.user || ""),
      "X-Cleanhub-Role": String(s.role || ""),
    };
  } catch {
    return {};
  }
}

export function mergeHeaders(base = {}) {
  return { ...base, ...actorHeaders() };
}
