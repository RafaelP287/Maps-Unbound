import { Link } from "react-router-dom";
import placeholderImage from "../campaigns/images/DnD.jpg";

const formatStartDate = (value) => {
  if (!value) return "Start TBD";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Start TBD" : date.toLocaleDateString();
};

function JoinCodePanel({
  joinCode,
  joiningByCode,
  onJoinCodeChange,
  onJoinWithCode,
}) {
  return (
    <section className="pf-code-panel">
      <div>
        <h2>Have A Join Code?</h2>
        <p>Enter a private campaign code from your DM to join immediately if a seat is open.</p>
      </div>
      <form className="pf-code-form" onSubmit={onJoinWithCode}>
        <input
          aria-label="Campaign join code"
          className="pf-code-input"
          maxLength={12}
          placeholder="ENTER CODE"
          value={joinCode}
          onChange={(event) => onJoinCodeChange(event.target.value.toUpperCase())}
        />
        <button type="submit" disabled={!joinCode.trim() || joiningByCode}>
          {joiningByCode ? "Joining..." : "Join"}
        </button>
      </form>
    </section>
  );
}

function JoinRequestsPanel({
  joinRequests,
  requestsLoading,
  resolvingRequestId,
  onResolveJoinRequest,
}) {
  return (
    <section className="pf-request-panel">
      <div className="pf-section-heading-row">
        <h2>Requests For Your Campaigns</h2>
        <span>{joinRequests.length} pending</span>
      </div>
      {requestsLoading ? (
        <p className="pf-loading">Checking your tables...</p>
      ) : joinRequests.length > 0 ? (
        <div className="pf-request-list">
          {joinRequests.map((request) => {
            const isResolving = resolvingRequestId === request._id;
            const isFull = request.playerCount >= request.maxPlayers;

            return (
              <article className="pf-request-item" key={request._id}>
                <div>
                  <h3>{request.user?.username || "Unknown player"}</h3>
                  <p>
                    {request.campaignTitle} · {request.playerCount}/{request.maxPlayers || 5} player slots
                  </p>
                  <p>
                    Requested {request.requestedAt ? new Date(request.requestedAt).toLocaleString() : "recently"}
                  </p>
                </div>
                <div className="pf-request-actions">
                  <button
                    type="button"
                    className="pf-approve-btn"
                    disabled={isResolving || isFull}
                    title={isFull ? "This campaign is full." : ""}
                    onClick={() => onResolveJoinRequest(request, "Approved")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="pf-reject-btn"
                    disabled={isResolving}
                    onClick={() => onResolveJoinRequest(request, "Rejected")}
                  >
                    Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="pf-empty">No pending requests for campaigns you run.</p>
      )}
    </section>
  );
}

function CampaignCard({ campaign, requestingCampaignId, onRequestToJoin }) {
  const isFull = campaign.playerCount >= campaign.maxPlayers;
  const canRequest = !campaign.isMember && !campaign.requestStatus && !isFull;
  const isRequesting = requestingCampaignId === campaign._id;

  return (
    <article className="pf-campaign-card">
      <img
        className="pf-campaign-image"
        src={campaign.image || placeholderImage}
        alt=""
      />
      <div className="pf-campaign-card-body">
        <div className="pf-campaign-card-header">
          <div>
            <h2>{campaign.title}</h2>
            <p>{campaign.description || "No campaign description yet."}</p>
          </div>
          <span className="pf-request-status pf-request-status-pending">
            {campaign.status || "Planning"}
          </span>
        </div>

        <div className="pf-campaign-info">
          <span>DM: {campaign.dm?.username || "Unknown"}</span>
          <span>{campaign.playStyle || "Online"}</span>
          <span>{formatStartDate(campaign.startDate)}</span>
          <span>{campaign.playerCount}/{campaign.maxPlayers || 5} player slots</span>
        </div>

        <div className="pf-campaign-actions">
          {campaign.isMember ? (
            <Link className="btn-primary campaign-btn-link" to={`/campaigns/${campaign._id}`}>
              Open Campaign
            </Link>
          ) : campaign.requestStatus ? (
            <span className={`pf-request-status pf-request-status-${campaign.requestStatus.toLowerCase()}`}>
              Request {campaign.requestStatus}
            </span>
          ) : (
            <button
              type="button"
              disabled={!canRequest || isRequesting}
              onClick={() => onRequestToJoin(campaign._id)}
            >
              {isFull ? "Campaign Full" : isRequesting ? "Sending..." : "Request to Join"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function CampaignsTab({
  campaigns,
  isLoading,
  joinRequests,
  joinCode,
  joiningByCode,
  requestsLoading,
  requestingCampaignId,
  resolvingRequestId,
  onJoinCodeChange,
  onJoinWithCode,
  onRequestToJoin,
  onResolveJoinRequest,
}) {
  return (
    <>
      <JoinCodePanel
        joinCode={joinCode}
        joiningByCode={joiningByCode}
        onJoinCodeChange={onJoinCodeChange}
        onJoinWithCode={onJoinWithCode}
      />

      <JoinRequestsPanel
        joinRequests={joinRequests}
        requestsLoading={requestsLoading}
        resolvingRequestId={resolvingRequestId}
        onResolveJoinRequest={onResolveJoinRequest}
      />

      {isLoading ? (
        <p className="pf-loading">Scrying for campaigns...</p>
      ) : campaigns.length > 0 ? (
        <div className="pf-campaign-list">
          {campaigns.map((campaign) => (
            <CampaignCard
              campaign={campaign}
              key={campaign._id}
              requestingCampaignId={requestingCampaignId}
              onRequestToJoin={onRequestToJoin}
            />
          ))}
        </div>
      ) : (
        <p className="pf-empty">No campaigns are recruiting right now.</p>
      )}
    </>
  );
}

export default CampaignsTab;
