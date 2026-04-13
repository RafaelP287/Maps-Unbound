// Shared hero section used by both CampaignDMView and CampaignPlayerView.
// In edit mode (DM only), renders editable title/description inputs.
// In view mode, renders the styled read-only header.

function CampaignHero({ campaign, isEditing = false, editTitle, editDescription, onTitleChange, onDescriptionChange }) {
  if (isEditing) {
    return (
      <section className="campaign-hero">
        <div className="campaign-hero-edit-wrap">
          <input
            className="campaign-hero-edit-title"
            value={editTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Campaign title"
          />
          <textarea
            style={{ minHeight: "80px", resize: "vertical" }}
            value={editDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Campaign description"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="campaign-hero">
      <div className="campaign-hero-text">
        <div className="campaign-hero-divider" />
        <h1 className="campaign-hero-title">{campaign.title}</h1>
        <div className="campaign-hero-divider" />
        <p className="campaign-hero-desc">{campaign.description}</p>
      </div>
    </section>
  );
}

export default CampaignHero;
