/**
 * Demo gate: client sends X-Cleanhub-User-Id from login; server verifies row is role admin.
 * Not a substitute for real JWT/auth in production.
 */
export function createRequireAdmin(prisma) {
  return async function requireAdmin(req, res, next) {
    try {
      const id = String(req.headers["x-cleanhub-user-id"] || "").trim();
      if (!id) {
        return res.status(401).json({ error: "Missing session. Log in again." });
      }
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required." });
      }
      req.actor = user;
      next();
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Auth check failed" });
    }
  };
}
