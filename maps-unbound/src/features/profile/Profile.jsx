import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  Crown,
  Map,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import Gate from "../../shared/Gate.jsx";
import ImageDrop from "../../shared/ImageDrop.jsx";
import LoadingPage from "../../shared/Loading.jsx";

function formatDisplayName(username = "") {
  if (!username) return "Adventurer";
  return username.charAt(0).toUpperCase() + username.slice(1);
}

function getCampaignRole(campaign, userId) {
  const member = campaign.members?.find((entry) => {
    const memberId =
      typeof entry.userId === "object"
        ? entry.userId?._id || entry.userId?.id
        : entry.userId;
    return String(memberId) === String(userId);
  });

  return member?.role || "Player";
}

function formatDate(value) {
  if (!value) return "No date recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "No date recorded"
    : date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function Profile() {
  const { user, token, isLoggedIn, updateUser, loading: authLoading } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profileImageDraft, setProfileImageDraft] = useState(user?.profileImageUrl || "");
  const [profileImageSaving, setProfileImageSaving] = useState(false);
  const [profileImageError, setProfileImageError] = useState("");
  const [profileImageStatus, setProfileImageStatus] = useState("");
  const [isProfileImageModalOpen, setIsProfileImageModalOpen] = useState(false);
  const [profileImageBroken, setProfileImageBroken] = useState(false);
  const [draftImageBroken, setDraftImageBroken] = useState(false);
  const closeProfileImageButtonRef = useRef(null);

  useEffect(() => {
    setProfileImageDraft(user?.profileImageUrl || "");
    setProfileImageBroken(false);
  }, [user?.profileImageUrl]);

  useEffect(() => {
    setDraftImageBroken(false);
  }, [profileImageDraft]);

  useEffect(() => {
    if (!isLoggedIn || !user?.username || !token) {
      setCampaigns([]);
      setCharacters([]);
      return;
    }

    let cancelled = false;

    const loadProfileData = async () => {
      setLoading(true);
      setError("");
      try {
        const [campaignRes, characterRes] = await Promise.all([
          fetch("/api/campaigns", {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`/api/users/${encodeURIComponent(user.username)}/characters`),
        ]);

        if (!campaignRes.ok) {
          const data = await campaignRes.json().catch(() => ({}));
          throw new Error(data.error || data.message || "Failed to load campaigns.");
        }

        if (!characterRes.ok) {
          const data = await characterRes.json().catch(() => ({}));
          throw new Error(data.error || data.message || "Failed to load characters.");
        }

        const campaignData = await campaignRes.json();
        const characterData = await characterRes.json();

        if (!cancelled) {
          setCampaigns(Array.isArray(campaignData) ? campaignData : []);
          setCharacters(Array.isArray(characterData.characters) ? characterData.characters : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load profile details.");
          setCampaigns([]);
          setCharacters([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProfileData();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, token, user?.username]);

  const stats = useMemo(() => {
    const dmCampaigns = campaigns.filter((campaign) => getCampaignRole(campaign, user?.id) === "DM").length;
    const playerCampaigns = campaigns.length - dmCampaigns;

    return [
      { label: "Campaigns", value: campaigns.length, icon: Map },
      { label: "Characters", value: characters.length, icon: Swords },
      { label: "DM Seats", value: dmCampaigns, icon: Crown },
      { label: "Player Seats", value: playerCampaigns, icon: Shield },
    ];
  }, [campaigns, characters, user?.id]);

  const profileCampaigns = campaigns;
  const profileCharacters = characters;
  const hasProfileImageChange = profileImageDraft !== (user?.profileImageUrl || "");
  const profileInitial = user?.username?.charAt(0).toUpperCase() || "A";

  const openProfileImageModal = () => {
    setProfileImageDraft(user?.profileImageUrl || "");
    setProfileImageError("");
    setProfileImageStatus("");
    setIsProfileImageModalOpen(true);
  };

  const closeProfileImageModal = useCallback(() => {
    if (profileImageSaving) return;
    setProfileImageDraft(user?.profileImageUrl || "");
    setProfileImageError("");
    setProfileImageStatus("");
    setIsProfileImageModalOpen(false);
  }, [profileImageSaving, user?.profileImageUrl]);

  useEffect(() => {
    if (!isProfileImageModalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeProfileImageButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeProfileImageModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeProfileImageModal, isProfileImageModalOpen]);

  const saveProfileImage = async () => {
    if (!token || profileImageSaving) return;

    setProfileImageSaving(true);
    setProfileImageError("");
    setProfileImageStatus("");
    try {
      const res = await fetch("/api/users/me/profile-image", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profileImageUrl: profileImageDraft || "" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || "Failed to update profile image.");
      }

      const data = await res.json();
      updateUser(data.user);
      setProfileImageStatus("Profile image updated.");
      setIsProfileImageModalOpen(false);
    } catch (err) {
      setProfileImageError(err.message || "Failed to update profile image.");
    } finally {
      setProfileImageSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="profile-page">
        <div className="profile-loading-page">
          <LoadingPage>Opening your profile...</LoadingPage>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Gate>Sign in to view your profile.</Gate>;
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading-page">
          <LoadingPage>Gathering your chronicles...</LoadingPage>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-shell">
        <header className="profile-header">
          <div className="profile-identity">
            <button
              type="button"
              className="profile-avatar"
              onClick={openProfileImageModal}
              aria-label="Change profile icon"
              title="Change profile icon"
            >
              {user?.profileImageUrl && !profileImageBroken ? (
                <img src={user.profileImageUrl} alt="" onError={() => setProfileImageBroken(true)} />
              ) : (
                <span>{profileInitial}</span>
              )}
              <span className="profile-avatar-edit">Change</span>
            </button>
            <div>
              <p className="profile-eyebrow">Player Profile</p>
              <h1 className="profile-title">{formatDisplayName(user?.username)}</h1>
              <p className="profile-subtitle">{user?.email || "No email on file"}</p>
            </div>
          </div>

          <div className="profile-actions">
            <Link to="/campaigns/new" className="profile-action profile-action-primary">
              <Sparkles aria-hidden="true" />
              New Campaign
            </Link>
            <Link to="/create-character" className="profile-action">
              <UserRound aria-hidden="true" />
              New Character
            </Link>
          </div>
        </header>

        <div className="profile-divider" />

        <>
            {error && <div className="profile-error">{error}</div>}

            <section className="profile-stats" aria-label="Profile summary">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div className="profile-stat" key={stat.label}>
                    <span className="profile-stat-icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <span className="profile-stat-label">{stat.label}</span>
                    <strong className="profile-stat-value">{stat.value}</strong>
                  </div>
                );
              })}
            </section>

            <div className="profile-grid">
              <section className="profile-panel">
                <div className="profile-section-head">
                  <div>
                    <p className="profile-section-kicker">Table Work</p>
                    <h2 className="profile-section-title">Campaigns</h2>
                  </div>
                  <Link to="/campaigns" className="profile-text-link">View All</Link>
                </div>

                <div className="profile-panel-scroll">
                  {profileCampaigns.length > 0 ? (
                    <div className="profile-list">
                      {profileCampaigns.map((campaign) => {
                        const role = getCampaignRole(campaign, user?.id);
                        return (
                          <Link
                            to={`/campaigns/${campaign._id}`}
                            className="profile-list-item"
                            key={campaign._id}
                          >
                            <span className="profile-list-icon">
                              {role === "DM" ? <Crown aria-hidden="true" /> : <Users aria-hidden="true" />}
                            </span>
                            <span className="profile-list-main">
                              <strong>{campaign.title || "Untitled Campaign"}</strong>
                              <span>
                                {role} • {campaign.members?.length || 0} members • {campaign.status || "Planning"}
                              </span>
                            </span>
                            <span className="profile-list-date">
                              <CalendarDays aria-hidden="true" />
                              {formatDate(campaign.updatedAt || campaign.createdAt)}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="profile-empty">
                      <ScrollText aria-hidden="true" />
                      <p>No campaigns yet.</p>
                      <Link to="/campaigns/new" className="profile-text-link">Forge one</Link>
                    </div>
                  )}
                </div>
              </section>

              <section className="profile-panel">
                <div className="profile-section-head">
                  <div>
                    <p className="profile-section-kicker">Roster</p>
                    <h2 className="profile-section-title">Characters</h2>
                  </div>
                  <Link to="/characters" className="profile-text-link">View All</Link>
                </div>

                <div className="profile-panel-scroll">
                  {profileCharacters.length > 0 ? (
                    <div className="profile-card-grid">
                      {profileCharacters.map((character) => {
                        const characterId = character.characterId || character._id;
                        return (
                          <Link
                            to={`/characters/${characterId}/edit`}
                            className="profile-character-card"
                            key={character._id || character.characterId}
                          >
                            <span className="profile-character-icon">
                              <BookOpen aria-hidden="true" />
                            </span>
                            <strong>{character.name || "Unnamed Hero"}</strong>
                            <span>
                              Level {character.level || 1} {character.race?.name || "Adventurer"}{" "}
                              {character.class?.name || "Hero"}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="profile-empty">
                      <UserRound aria-hidden="true" />
                      <p>No characters yet.</p>
                      <Link to="/create-character" className="profile-text-link">Create one</Link>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
      </div>

      {isProfileImageModalOpen && (
        <div className="profile-modal-backdrop" role="presentation" onClick={closeProfileImageModal}>
          <div
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-image-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="profile-section-head">
              <div>
                <p className="profile-section-kicker">Identity</p>
                <h2 className="profile-section-title" id="profile-image-title">Profile Icon</h2>
              </div>
              <button
                type="button"
                className="profile-modal-close"
                onClick={closeProfileImageModal}
                disabled={profileImageSaving}
                ref={closeProfileImageButtonRef}
              >
                Close
              </button>
            </div>
            <div className="profile-image-editor">
              <div className="profile-image-preview" aria-hidden="true">
                {profileImageDraft && !draftImageBroken ? (
                  <img src={profileImageDraft} alt="" onError={() => setDraftImageBroken(true)} />
                ) : (
                  <span>{profileInitial}</span>
                )}
              </div>
              <div className="profile-image-drop">
                <ImageDrop
                  imagePreview={profileImageDraft || null}
                  onImageChange={(value) => {
                    setProfileImageDraft(value || "");
                    setProfileImageError("");
                    setProfileImageStatus("");
                  }}
                  compact
                />
              </div>
            </div>
            {profileImageError && <p className="profile-inline-error">{profileImageError}</p>}
            {profileImageStatus && <p className="profile-inline-success">{profileImageStatus}</p>}
            <div className="profile-modal-actions">
              <button
                type="button"
                className="profile-modal-close"
                onClick={closeProfileImageModal}
                disabled={profileImageSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="profile-save-button"
                onClick={saveProfileImage}
                disabled={!hasProfileImageChange || profileImageSaving}
              >
                {profileImageSaving ? "Saving..." : "Save Icon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
