const apiServer = (import.meta.env.VITE_API_SERVER || "").replace(/\/$/, "");

function assertApiServer() {
  if (!apiServer) {
    throw new Error("VITE_API_SERVER is not set — add it to your .env for the compendium proxy.");
  }
}

/**
 * Maps upstream D&D 5e API paths to this app's backend proxy.
 * Examples: /api/2014/spells → {origin}/api/dnd/spells ; /api/images/... → {origin}/api/dnd/images/...
 */
export function proxyUrlFromUpstreamPath(pathOrUrl) {
  assertApiServer();
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http")) {
    if (pathOrUrl.startsWith(apiServer)) return pathOrUrl;
    try {
      const u = new URL(pathOrUrl);
      const p = u.pathname;
      if (p.startsWith("/api/2014/")) {
        const rest = p.slice("/api/2014/".length);
        return `${apiServer}/api/dnd/${rest}${u.search}`;
      }
      if (p.startsWith("/api/images/")) {
        const rest = p.slice("/api/".length);
        return `${apiServer}/api/dnd/${rest}${u.search}`;
      }
    } catch {
      /* fall through */
    }
    return pathOrUrl;
  }
  if (pathOrUrl.startsWith("/api/images/")) {
    const rest = pathOrUrl.slice("/api/".length);
    return `${apiServer}/api/dnd/${rest}`;
  }
  if (pathOrUrl.startsWith("/api/2014/")) {
    const rest = pathOrUrl.slice("/api/2014/".length);
    return `${apiServer}/api/dnd/${rest}`;
  }
  const trimmed = pathOrUrl.replace(/^\//, "");
  return `${apiServer}/api/dnd/${trimmed}`;
}

// Fetches JSON data from the DnD API
export async function fetchJson(pathOrUrl) {
  const url = proxyUrlFromUpstreamPath(pathOrUrl);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Compendium request failed (${res.status})`);
  return res.json();
}

/** Fetches the categories of the DnD API and puts in a list */
export async function fetchResourceList(endpoint) {
  const data = await fetchJson(`/api/2014/${endpoint}`);
  if (!Array.isArray(data?.results)) return [];
  return data.results;
}

/** Public URLs for <img src> etc. */
export function toAbsoluteUrl(pathOrUrl) {
  return proxyUrlFromUpstreamPath(pathOrUrl);
}
