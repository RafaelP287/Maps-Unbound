import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import LoadingPage from "../../shared/Loading.jsx";
import useCampaign from "./use-campaign.js";
import CampaignDMView from "./CampaignDMView.jsx";
import CampaignPlayerView from "./CampaignPlayerView.jsx";

function ViewCampaignPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { campaign, loading, error, refetch } = useCampaign(id);

  if (loading || authLoading) {
    return <LoadingPage>Unravelling the scroll...</LoadingPage>;
  }

  if (error) {
    const showLoginCta = error.toLowerCase().includes("sign in");
    return (
      <div className="campaign-full-center">
        <p className="campaign-error-msg">⚠ {error}</p>
        <div className="campaign-btn-row">
          {showLoginCta && <Link to="/login" className="btn-primary campaign-btn-link">Sign In</Link>}
          <Link to="/campaigns" className="btn-ghost campaign-btn-link">← Back to Campaigns</Link>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="campaign-full-center">
        <p className="campaign-error-msg">Campaign not found.</p>
        <Link to="/campaigns" className="btn-ghost campaign-btn-link">← Back to Campaigns</Link>
      </div>
    );
  }

  const dmMember = campaign.members.find((m) => m.role === "DM");
  const isDM = dmMember?.userId?._id?.toString() === user?.id?.toString();

  // Route users to role-specific UIs: DM gets management controls, players get read-focused view.
  return isDM
    ? <CampaignDMView campaign={campaign} refetch={refetch} />
    : <CampaignPlayerView campaign={campaign} user={user} />;
}

export default ViewCampaignPage;
