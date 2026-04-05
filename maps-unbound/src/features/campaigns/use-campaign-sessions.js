import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

function useCampaignSessions(campaignId) {
  const { token } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSessions = async () => {
    if (!token || !campaignId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions?campaignId=${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load sessions");
      }
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, token]);

  return { sessions, loading, error, refetch: fetchSessions };
}

export default useCampaignSessions;
