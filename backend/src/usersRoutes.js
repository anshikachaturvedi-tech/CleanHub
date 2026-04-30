import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

async function createUserWithBody(prisma, req, res) {
  const username = String(req.body?.username ?? "").trim();
  const password = String(req.body?.password ?? "");
  const displayName = req.body?.displayName != null ? String(req.body.displayName).trim() || null : null;
  const email = req.body?.email != null ? String(req.body.email).trim() || null : null;
  const phone = req.body?.phone != null ? String(req.body.phone).trim() || null : null;

  if (username.length < 3) {
    res.status(400).json({ error: "Username must be at least 3 characters." });
    return null;
  }
  if (password.length < 4) {
    res.status(400).json({ error: "Password must be at least 4 characters." });
    return null;
  }
  if (username === "admin") {
    res.status(409).json({ error: "Username admin is reserved for the seeded demo account." });
    return null;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        displayName,
        email,
        phone,
        role: "user",
      },
    });
    return user;
  } catch (e) {
    if (e?.code === "P2002") {
      res.status(409).json({ error: "Username already taken." });
      return null;
    }
    console.error(e);
    res.status(500).json({ error: "Failed to create user" });
    return null;
  }
}

/**
 * @param {import("express").Express} app
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {import("express").RequestHandler} requireAdmin
 */
export function registerUserRoutes(app, prisma, requireAdmin) {
  app.post("/api/auth/login", async (req, res) => {
    const username = String(req.body?.username ?? "").trim();
    const password = String(req.body?.password ?? "");
    if (!username || !password) {
      return res.status(400).json({ error: "username and password required" });
    }
    try {
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password." });
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ error: "Invalid username or password." });
      }
      res.json({ user: publicUser(user) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Login failed" });
    }
  });

  /** Public sign-up (creates role `user` only). */
  app.post("/api/auth/register", async (req, res) => {
    const user = await createUserWithBody(prisma, req, res);
    if (user) res.status(201).json({ user: publicUser(user) });
  });

  app.get("/api/users", requireAdmin, async (_req, res) => {
    try {
      const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
      res.json({ users: users.map(publicUser) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to list users" });
    }
  });

  app.get("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ user: publicUser(user) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  /** Admin creates a user from the Users screen (same rules as register). */
  app.post("/api/users", requireAdmin, async (req, res) => {
    const user = await createUserWithBody(prisma, req, res);
    if (user) res.status(201).json({ user: publicUser(user) });
  });

  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    const id = req.params.id;
    try {
      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: "User not found" });

      const data = {};
      if (req.body.displayName !== undefined) {
        data.displayName = req.body.displayName == null || String(req.body.displayName).trim() === "" ? null : String(req.body.displayName).trim();
      }
      if (req.body.email !== undefined) {
        data.email = req.body.email == null || String(req.body.email).trim() === "" ? null : String(req.body.email).trim();
      }
      if (req.body.phone !== undefined) {
        data.phone = req.body.phone == null || String(req.body.phone).trim() === "" ? null : String(req.body.phone).trim();
      }
      if (req.body.username !== undefined) {
        const nu = String(req.body.username).trim();
        if (nu.length < 3) return res.status(400).json({ error: "Username too short" });
        if (existing.username === "admin" && nu !== "admin") {
          return res.status(400).json({ error: "Cannot rename the demo admin account." });
        }
        if (nu === "admin" && existing.username !== "admin") {
          return res.status(409).json({ error: "Username admin is reserved." });
        }
        data.username = nu;
      }
      if (req.body.password !== undefined && String(req.body.password).length > 0) {
        if (String(req.body.password).length < 4) {
          return res.status(400).json({ error: "Password must be at least 4 characters." });
        }
        data.passwordHash = await bcrypt.hash(String(req.body.password), SALT_ROUNDS);
      }
      if (req.body.role !== undefined) {
        const r = String(req.body.role).toLowerCase();
        if (!["user", "admin"].includes(r)) {
          return res.status(400).json({ error: "Invalid role" });
        }
        if (existing.username === "admin" && r !== "admin") {
          return res.status(400).json({ error: "Cannot demote the demo admin account." });
        }
        data.role = r;
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      const user = await prisma.user.update({
        where: { id },
        data,
      });
      res.json({ user: publicUser(user) });
    } catch (e) {
      if (e?.code === "P2002") {
        return res.status(409).json({ error: "Username already taken." });
      }
      console.error(e);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    const id = req.params.id;
    try {
      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: "User not found" });
      if (existing.username === "admin") {
        return res.status(403).json({ error: "Cannot delete the seeded demo admin account." });
      }
      await prisma.user.delete({ where: { id } });
      res.status(204).send();
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
}
