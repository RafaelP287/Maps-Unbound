import { Link, useSearchParams } from "react-router-dom";
import useCampaign from "../campaigns/use-campaign";
import "./session.css";
import LoadingPage from "../../shared/Loading.jsx";

function Session() {
    const [searchParams] = useSearchParams();
    const campaignId = searchParams.get("campaignId");
    const { campaign, loading } = useCampaign(campaignId);
    const dmLink = campaignId ? `/session/dm?campaignId=${campaignId}` : "/session/dm";
    const campaignName = loading ? "Loading..." : campaign?.title || "Unknown Campaign";

    if (loading) {
        return <LoadingPage>Preparing the session...</LoadingPage>;
    }

    return (
        <div className="session-page">
            <div className="session-card">
                <h1>Session Lobby</h1>
                <p>This will probably be a lobby waiting page or a page to select the campaign.</p>
                {campaignId && (
                    <p>Selected campaign: {campaignName}</p>
                )}
                <p>Button to test for DM View.</p>
                <div className="session-actions">
                    <Link to={dmLink}>
                        <button>DM View</button>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default Session;
