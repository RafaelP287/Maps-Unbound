import jwt from "jsonwebtoken";

// Verifies the JWT from the Authorization header and attaches req.user.
// Expects header format:  Authorization: Bearer <token>
//
// On success: req.user = { userId, username }, plus req.userId for back-compat
// On failure: 401 { error: "..." }
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: payload.userId,
      username: payload.username,
    };
    // Back-compat for code that uses req.userId at the top level
    req.userId = payload.userId;
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Alias for files that imported the older name
export const verifyToken = requireAuth;
export default requireAuth;
