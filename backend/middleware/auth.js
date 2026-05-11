
import jwt from "jsonwebtoken";
 
// Verifies the JWT from the Authorization header and attaches req.user.
// Use this on routes that need to know who the logged-in user is.
//
// Expects header format:  Authorization: Bearer <token>
//
// On success: req.user = { userId, username }
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
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
}
 
export default requireAuth;
