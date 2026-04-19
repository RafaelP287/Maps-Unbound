import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import LoadingPage from "../../shared/Loading.jsx";
import useCampaign from "./use-campaign.js";

function CampaignJournalView() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { campaign, loading, error } = useCampaign(id);

  if (loading || authLoading) {
    return <LoadingPage>Opening the campaign journal...</LoadingPage>;
  }

  if (error || !campaign) {
    return (
      <div className="campaign-full-center">
        <p className="campaign-error-msg">{error || "Campaign not found."}</p>
        <div className="campaign-btn-row">
          <Link to="/campaigns" className="btn-ghost campaign-btn-link">Back to Campaigns</Link>
        </div>
      </div>
    );
  }

  const dmMember = campaign.members.find((member) => member.role === "DM");
  const isDM = dmMember?.userId?._id?.toString() === user?.id?.toString();

  return (
    <div className="campaign-page campaign-page-padded">
      <div className="campaign-content-wide">
        <div className="campaign-page-header-wide">
          <div className="campaign-header-row">
            <span className="campaign-header-rune-lg">✦</span>
            <h1 className="campaign-page-title-lg">Campaign Journal</h1>
            <span className="campaign-header-rune-lg">✦</span>
          </div>
          <div className="campaign-header-divider" />
          <p className="campaign-page-subtitle">
            {campaign.title}’s official record of sessions, encounters, and party-written history.
          </p>
        </div>

        <section className="campaign-journal-hero-panel">
          <div className="campaign-journal-hero-copy">
            <span className="campaign-journal-eyebrow">Primary Chronicle</span>
            <h2 className="campaign-journal-title">The journal will become the campaign’s memory.</h2>
            <p className="campaign-journal-text">
              This is where session recaps, encounter highlights, and player or DM entries will live
              together in one searchable timeline.
            </p>
            <p className="campaign-journal-text">
              {isDM
                ? "When the backend routes are connected, you’ll be able to curate the journal, review system-generated updates, and guide the party’s shared story from here."
                : "When the backend routes are connected, you’ll be able to review the party timeline and contribute your own entries alongside session and encounter history."}
            </p>
          </div>
          <div className="campaign-journal-callout">
            <span className="campaign-journal-callout-label">Why it matters</span>
            <p className="campaign-journal-callout-text">
              Important discoveries, battle outcomes, and story beats should be easy to find long
              after a session ends. The journal is designed to be that source of truth.
            </p>
          </div>
        </section>

        <section className="campaign-card-panel">
          <div className="campaign-details-header">
            <span className="campaign-details-icon">✦</span>
            <span className="campaign-details-heading">Status</span>
            <span className="campaign-details-icon">✦</span>
          </div>
          <div className="campaign-journal-placeholder">
            <p className="campaign-section-empty">
              Journal entry loading and editing are not wired up yet. The navigation and page are in
              place so the Campaign Journal already has a dedicated home in the campaign flow.
            </p>
          </div>
          <div className="campaign-footer campaign-footer-split">
            <Link to={`/campaigns/${campaign._id}`} className="btn-ghost campaign-btn-link">
              Back to Campaign
            </Link>
            <Link to="/campaigns" className="btn-ghost campaign-btn-link">
              Back to Campaigns
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CampaignJournalView;
