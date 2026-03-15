import { Link, useSearchParams } from "react-router-dom";
import "./session.css";

function Session() {
    const [searchParams] = useSearchParams();
    const campaignId = searchParams.get("campaignId");
    const dmLink = campaignId ? `/session/dm?campaignId=${campaignId}` : "/session/dm";

    return (
        <div className="session-page">
            <div className="session-card">
                <h1>Session Page</h1>
                <p>This will probably be a lobby waiting page or a page to select the campaign.</p>
                {campaignId && (
                    <p>Selected campaign: {campaignId}</p>
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
