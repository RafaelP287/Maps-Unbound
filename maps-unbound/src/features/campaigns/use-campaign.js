import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

function useCampaign(id) {
  const { token, isLoggedIn } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCampaign = useCallback(async () => {
    // Guard against invalid navigation states before hitting the API.
    if (!id) { setError("No campaign ID provided."); setLoading(false); return; }
    if (!isLoggedIn) { setError("Please sign in to view campaign details."); setLoading(false); return; }
    setLoading(true);
    try {
      // Request campaign by id; response includes populated member user objects for display.
      const res = await fetch(`/api/campaigns/${id}`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const data = await res.json();
      if (!data || !data._id) setError("Campaign not found.");
      else setCampaign(data);
    } catch (err) { console.error(err); setError("Failed to load campaign."); }
    finally { setLoading(false); }
  }, [id, token, isLoggedIn]);

  useEffect(() => { fetchCampaign(); }, [fetchCampaign]);

  return { campaign, setCampaign, loading, error, refetch: fetchCampaign };
}

export default useCampaign;
