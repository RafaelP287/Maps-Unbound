import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

const getCampaignFetchError = (status, fallbackMessage) => {
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403) return "You do not have access to this campaign.";
  if (status === 404) return "Campaign not found.";
  return fallbackMessage || "Failed to load campaign.";
};

function useCampaign(id) {
  const { token, isLoggedIn } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCampaign = useCallback(async () => {
    // Guard against invalid navigation states before hitting the API.
    if (!id) { setError("No campaign ID provided."); setLoading(false); return; }
    if (!isLoggedIn) { setError("Please sign in to view campaign details."); setLoading(false); return; }
    setError(null);
    setLoading(true);
    try {
      // Request campaign by id; response includes populated member user objects for display.
      const res = await fetch(`/api/campaigns/${id}`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const serverMessage = payload?.error || payload?.message;
        throw new Error(getCampaignFetchError(res.status, serverMessage));
      }
      const data = await res.json();
      if (!data || !data._id) setError("Campaign not found.");
      else setCampaign(data);
    } catch (err) {
      console.error(err);
      setCampaign(null);
      if (err instanceof TypeError) setError("Unable to reach the server. Check your connection and try again.");
      else setError(err.message || "Failed to load campaign.");
    }
    finally { setLoading(false); }
  }, [id, token, isLoggedIn]);

  useEffect(() => { fetchCampaign(); }, [fetchCampaign]);

  return { campaign, setCampaign, loading, error, refetch: fetchCampaign };
}

export default useCampaign;
