function InvitationsPanel({
  invitations,
  invitationsLoading,
  resolvingInvitationId,
  onRespondToInvitation,
}) {
  return (
    <section className="pf-request-panel">
      <div className="pf-section-heading-row">
        <h2>Your Campaign Invitations</h2>
        <span>{invitations.length} pending</span>
      </div>
      {invitationsLoading ? (
        <p className="pf-loading">Checking your invitations...</p>
      ) : invitations.length > 0 ? (
        <div className="pf-request-list">
          {invitations.map((invitation) => {
            const isResolving = resolvingInvitationId === invitation._id;
            return (
              <article className="pf-request-item" key={invitation._id}>
                <div>
                  <h3>{invitation.campaignTitle}</h3>
                  <p>
                    DM: {invitation.dm?.username || invitation.invitedBy?.username || "Unknown"} · {invitation.playerCount}/{invitation.maxPlayers || 5} player slots
                  </p>
                  <p>
                    Invited {invitation.invitedAt ? new Date(invitation.invitedAt).toLocaleString() : "recently"}
                  </p>
                </div>
                <div className="pf-request-actions">
                  <button
                    type="button"
                    className="pf-approve-btn"
                    disabled={isResolving}
                    onClick={() => onRespondToInvitation(invitation, "Accepted")}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="pf-reject-btn"
                    disabled={isResolving}
                    onClick={() => onRespondToInvitation(invitation, "Declined")}
                  >
                    Decline
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="pf-empty">No pending campaign invitations.</p>
      )}
    </section>
  );
}

function PlayerInviteCard({ player, invitingPlayerId, onOpenInviteOverlay }) {
  const isInviting = invitingPlayerId === player._id;

  return (
    <article className="pf-player-card">
      <span className="pf-player-avatar">
        {player.profileImageUrl ? (
          <img src={player.profileImageUrl} alt="" />
        ) : (
          player.username?.[0]?.toUpperCase() || "A"
        )}
      </span>
      <div>
        <h3>{player.username}</h3>
        <p>Open to campaign invites</p>
      </div>
      <button
        type="button"
        disabled={isInviting}
        onClick={() => onOpenInviteOverlay(player)}
      >
        {isInviting ? "Sending..." : "Invite"}
      </button>
    </article>
  );
}

function PlayerSearchPanel({
  user,
  dmCampaigns,
  playerSearch,
  invitablePlayers,
  playersLoading,
  invitingPlayerId,
  onPlayerSearchChange,
  onOpenInviteOverlay,
}) {
  return (
    <section className="pf-request-panel">
      <div className="pf-section-heading-row">
        <h2>Invite Players</h2>
        <span>{dmCampaigns.length} DM campaigns</span>
      </div>

      {!user?.openToCampaignInvites && (
        <div className="pf-alert pf-alert-warn">
          Your profile is closed to campaign invites. Open it in Account Settings if you want DMs to find you too.
        </div>
      )}

      {dmCampaigns.length > 0 ? (
        <>
          <p className="pf-helper-copy">
            Search shows players who are open to invites. Choose the campaign after selecting a player.
          </p>
          <div className="pf-recruit-controls">
            <label>
              <span>Search Players</span>
              <input
                type="text"
                placeholder="Search by username"
                value={playerSearch}
                onChange={(event) => onPlayerSearchChange(event.target.value)}
              />
            </label>
          </div>

          {playersLoading ? (
            <p className="pf-loading">Searching for open adventurers...</p>
          ) : invitablePlayers.length > 0 ? (
            <div className="pf-player-list">
              {invitablePlayers.map((player) => (
                <PlayerInviteCard
                  invitingPlayerId={invitingPlayerId}
                  key={player._id}
                  player={player}
                  onOpenInviteOverlay={onOpenInviteOverlay}
                />
              ))}
            </div>
          ) : (
            <p className="pf-empty">
              No open players found. Try a different search term.
            </p>
          )}
        </>
      ) : (
        <p className="pf-empty">Create or open a campaign as DM before inviting players.</p>
      )}
    </section>
  );
}

function PlayersTab({
  user,
  invitations,
  invitationsLoading,
  resolvingInvitationId,
  dmCampaigns,
  playerSearch,
  invitablePlayers,
  playersLoading,
  invitingPlayerId,
  onPlayerSearchChange,
  onRespondToInvitation,
  onOpenInviteOverlay,
}) {
  return (
    <div className="pf-recruiting-stack">
      <InvitationsPanel
        invitations={invitations}
        invitationsLoading={invitationsLoading}
        resolvingInvitationId={resolvingInvitationId}
        onRespondToInvitation={onRespondToInvitation}
      />

      <PlayerSearchPanel
        dmCampaigns={dmCampaigns}
        invitablePlayers={invitablePlayers}
        invitingPlayerId={invitingPlayerId}
        playerSearch={playerSearch}
        playersLoading={playersLoading}
        user={user}
        onOpenInviteOverlay={onOpenInviteOverlay}
        onPlayerSearchChange={onPlayerSearchChange}
      />
    </div>
  );
}

export default PlayersTab;
