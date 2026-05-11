import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'maps-unbound-secret-key');
    req.userId = decoded.userId;
    req.user = {
      userId: decoded.userId || decoded.id || decoded._id,
      username: decoded.username,
    };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'maps-unbound-secret-key');
    req.user = {
      userId: payload.userId || payload.id || payload._id,
      username: payload.username,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: error.name === "TokenExpiredError" ? "Token expired" : "Invalid token" });
  }
}

export default requireAuth;
