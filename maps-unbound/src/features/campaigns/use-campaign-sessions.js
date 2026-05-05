import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { setCachedValue, getCachedValue } from "../../shared/dataCache.js";

function useCampaignSessions(campaignId, options = {}) {
  const includeNotes = Boolean(options.includeNotes);
  const { user, token } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSessions = async () => {
    if (!token || !campaignId) return;
    const cacheKey = `campaign:sessions:${user?.id || "current"}:${campaignId}:${includeNotes ? "notes" : "summary"}`;
    const cachedSessions = getCachedValue(cacheKey);
    const hasCachedSessions = Boolean(cachedSessions);
    if (cachedSessions) {
      setSessions(cachedSessions);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const query = new URLSearchParams({ campaignId });
      if (includeNotes) query.set("includeNotes", "true");
      const res = await fetch(`/api/sessions?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load sessions");
      }
      const data = await res.json();
      const nextSessions = Array.isArray(data) ? data : [];
      setSessions(nextSessions);
      setCachedValue(cacheKey, nextSessions);
    } catch (err) {
      setError(err.message || "Failed to load sessions");
      if (!hasCachedSessions) setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, token, user?.id, includeNotes]);

  return { sessions, loading, error, refetch: fetchSessions };
}

export default useCampaignSessions;
