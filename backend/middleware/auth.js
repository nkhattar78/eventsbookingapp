const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.user_id, role: payload.role, name: payload.name };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

function userOnly(req, res, next) {
  if (!req.user || req.user.role !== "user") {
    return res.status(403).json({ error: "User access required" });
  }
  next();
}

module.exports = { authRequired, adminOnly, userOnly };
