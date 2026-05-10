import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import LoadingPage from "../../shared/Loading.jsx";
import useCampaign from "./use-campaign.js";
import CampaignDMView from "./CampaignDMView.jsx";
import CampaignPlayerView from "./CampaignPlayerView.jsx";
import "./campaign.css";

const getUserId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value.$oid) return value.$oid;
  if (value._id && value._id !== value) return getUserId(value._id);
  const stringValue = value.toString?.();
  if (stringValue && stringValue !== "[object Object]") return stringValue;
  if (typeof value.id === "string") return value.id;
  if (value.id && value.id !== value) return getUserId(value.id);
  return "";
};

function ViewCampaignPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { campaign, setCampaign, loading, error } = useCampaign(id);

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

  const currentUserId = getUserId(user?.id || user?._id);
  const currentMember = campaign.members.find((member) => getUserId(member.userId) === currentUserId);
  const isDM = currentMember?.role === "DM" || getUserId(campaign.createdBy) === currentUserId;

  // Route users to role-specific UIs: DM gets management controls, players get read-focused view.
  return isDM
    ? <CampaignDMView campaign={campaign} setCampaign={setCampaign} />
    : <CampaignPlayerView campaign={campaign} user={user} />;
}

export default ViewCampaignPage;
