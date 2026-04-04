import express from "express";

// Define the external API we are fetching data from and the local route prefix
const DND_ORIGIN = "https://www.dnd5eapi.co";
const MOUNT = "/api/dnd/";

const router = express.Router();

// Extracts the specific resource requested from the full URL.
function subpathFromOriginalUrl(originalUrl) {
  const pathOnly = originalUrl.split("?")[0]; // Strip off query parameters
  if (pathOnly === "/api/dnd" || pathOnly.endsWith("/api/dnd")) return ""; // Return empty if it's just the root
  
  const i = pathOnly.indexOf(MOUNT);
  if (i === -1) return ""; // Failsafe in case the mount path isn't found
  
  // Slice off the mount path and remove any leading slashes
  return pathOnly.slice(i + MOUNT.length).replace(/^\/+/, "");
}

// Catch-all GET route: Intercepts any request sent to this router
router.get(/.*/, async (req, res) => {
  // Get the exact resource path the user wants
  const subpath = subpathFromOriginalUrl(req.originalUrl || "");
  
  // Rewrite the URL. 
  // If it's an image, fetch from the root API. 
  // Otherwise, specifically target the 2014 version of the D&D ruleset.
  const targetBase = subpath.startsWith("images/")
    ? `${DND_ORIGIN}/api/${subpath}`
    : `${DND_ORIGIN}/api/2014/${subpath}`;

  // Re-attach any query parameters (like ?level=1) to the new URL
  const qIndex = req.originalUrl.indexOf("?");
  const search = qIndex >= 0 ? req.originalUrl.slice(qIndex) : "";
  const targetUrl = targetBase + search;

  try {
    // Make the actual request to the external D&D API
    const upstream = await fetch(targetUrl, {
      headers: { Accept: "*/*" },
    });
    
    // Read the response as a raw binary buffer (this ensures images load correctly alongside JSON)
    const ct = upstream.headers.get("content-type");
    const buf = Buffer.from(await upstream.arrayBuffer());
    
    // Forward the exact status code, content-type, and raw data back to your local client
    res.status(upstream.status);
    if (ct) res.setHeader("Content-Type", ct);
    res.send(buf);
    
  } catch (err) {
    // Handle network failures gracefully
    console.error("D&D proxy:", err);
    res.status(502).json({ message: "Failed to reach D&D 5e API" });
  }
});

export default router;
