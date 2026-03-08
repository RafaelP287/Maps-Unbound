import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import LoadingPage from "../../shared/Loading.jsx";
import useCampaign from "./use-campaign.js";
import DMView from "./DMView.jsx";
import PlayerView from "./PlayerView.jsx";

function ViewCampaignPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { campaign, loading, error, refetch } = useCampaign(id);

  if (loading || authLoading) {
    return <LoadingPage>Unravelling the scroll...</LoadingPage>;
  }

  if (error) {
    return (
      <div className="campaign-full-center">
        <p className="campaign-error-msg">⚠ {error}</p>
        <Link to="/campaigns"><button className="btn-ghost">← Back to Campaigns</button></Link>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="campaign-full-center">
        <p className="campaign-error-msg">Campaign not found.</p>
      </div>
    );
  }

  const dmMember = campaign.members.find((m) => m.role === "DM");
  const isDM = dmMember?.userId?._id?.toString() === user?.id?.toString();

  return isDM
    ? <DMView campaign={campaign} refetch={refetch} />
    : <PlayerView campaign={campaign} user={user} />;
}

export default ViewCampaignPage;