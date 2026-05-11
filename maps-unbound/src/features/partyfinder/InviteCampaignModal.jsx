function InviteCampaignModal({
  inviteTargetPlayer,
  validInviteCampaigns,
  selectedInviteCampaignId,
  inviteOverlayError,
  inviteCampaignsLoading,
  invitingPlayerId,
  onSelectedInviteCampaignIdChange,
  onClose,
  onSendInvitation,
}) {
  if (!inviteTargetPlayer) return null;

  return (
    <div className="pf-modal" role="dialog" aria-modal="true" aria-labelledby="pf-invite-title">
      <div className="pf-modal-content pf-invite-modal">
        <div className="pf-section-heading-row">
          <div>
            <h2 id="pf-invite-title">Choose Campaign</h2>
            <p className="pf-helper-copy">Invite {inviteTargetPlayer.username} to one of your eligible campaigns.</p>
          </div>
        </div>

        {inviteOverlayError && <div className="pf-alert pf-alert-error">{inviteOverlayError}</div>}

        {inviteCampaignsLoading ? (
          <p className="pf-loading">Checking eligible campaigns...</p>
        ) : validInviteCampaigns.length > 0 ? (
          <div className="pf-invite-campaign-list">
            {validInviteCampaigns.map((campaign) => (
              <label
                className={`pf-invite-campaign-option${selectedInviteCampaignId === campaign._id ? " is-selected" : ""}`}
                key={campaign._id}
              >
                <input
                  type="radio"
                  name="inviteCampaign"
                  value={campaign._id}
                  checked={selectedInviteCampaignId === campaign._id}
                  onChange={(event) => onSelectedInviteCampaignIdChange(event.target.value)}
                />
                <span>
                  <strong>{campaign.title}</strong>
                  <small>{campaign.playerCount}/{campaign.maxPlayers || 5} players</small>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="pf-empty">
            {inviteOverlayError ? "Resolve the issue above and try again." : "No eligible campaigns for this player right now."}
          </p>
        )}

        <div className="pf-modal-buttons">
          <button type="button" className="pf-cancel-btn" disabled={Boolean(invitingPlayerId)} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedInviteCampaignId || Boolean(invitingPlayerId) || inviteCampaignsLoading}
            onClick={onSendInvitation}
          >
            {invitingPlayerId ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InviteCampaignModal;
