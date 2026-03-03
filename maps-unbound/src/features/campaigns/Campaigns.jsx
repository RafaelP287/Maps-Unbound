import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import CampaignCard from "./CampaignCard.jsx";
import Gate from "../../shared/Gate.jsx";

function CampaignsPage() {
  const { user, token, isLoggedIn, loading: authLoading } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    const fetchCampaigns = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/campaigns", {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setCampaigns(data || []);
      } catch (err) {
        console.error("Error fetching campaigns:", err);
      } finally { setLoading(false); }
    };
    fetchCampaigns();
  }, [isLoggedIn, token]);

  if (loading || authLoading) {
    return (
      <div style={loadingWrapStyle}>
        <div style={runeSpinnerStyle}>✦</div>
        <p style={loadingTextStyle}>Consulting the arcane records…</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <Gate>
        Sign in to access your campaigns.
      </Gate>
    );
  }

  return (
    <div style={pageWrapStyle}>
      {/* Decorative noise overlay */}
      <div style={noiseOverlayStyle} />

      <div style={pageInnerStyle}>
        {/* Header */}
        <header style={headerStyle}>
          <div style={headerDividerStyle} />
          <div style={headerCenterStyle}>
            <span style={headerRuneStyle}>✦</span>
            <h1 style={pageTitleStyle}>Your Campaigns</h1>
            <span style={headerRuneStyle}>✦</span>
          </div>
          <div style={headerDividerStyle} />
          <Link to="/campaigns/new" style={{ marginTop: "1.5rem" }}>
            <button style={primaryBtnStyle}>+ Forge New Campaign</button>
          </Link>
        </header>

        {/* Campaign grid */}
        <div style={listStyle}>
          {campaigns.length > 0 ? (
            campaigns.map((c) => (
              <CampaignCard key={c._id} campaign={c} currentUser={user.id} />
            ))
          ) : (
            <div style={emptyStyle}>
              <span style={emptyIconStyle}>📜</span>
              <h2 style={emptyTitleStyle}>No campaigns found</h2>
              <p style={emptySubtextStyle}>
                The chronicles are blank. Begin a new adventure.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Styles ── */
const pageWrapStyle = {
  position: "relative",
  minHeight: "100vh",
  background: `radial-gradient(ellipse at 20% 0%, #1a1006 0%, var(--bg-deep) 60%)`,
  fontFamily: "'Crimson Text', Georgia, serif",
  overflow: "hidden",
};

const noiseOverlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
  pointerEvents: "none",
  zIndex: 0,
};

const pageInnerStyle = {
  position: "relative",
  zIndex: 1,
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "3rem 2rem 4rem",
};

const headerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginBottom: "3rem",
};

const headerDividerStyle = {
  width: "100%",
  height: "1px",
  background: `linear-gradient(to right, transparent, var(--border), transparent)`,
  margin: "0.6rem 0",
};

const headerCenterStyle = {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
};

const headerRuneStyle = {
  color: "var(--gold)",
  fontSize: "1.2rem",
  opacity: 0.7,
};

const pageTitleStyle = {
  fontFamily: "'Cinzel Decorative', serif",
  fontSize: "clamp(1.6rem, 4vw, 2.8rem)",
  color: "var(--gold-light)",
  margin: 0,
  letterSpacing: "0.05em",
  textShadow: `0 0 30px rgba(201,168,76,0.25)`,
};

const listStyle = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "20px",
};

const emptyStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.75rem",
  padding: "3rem 2rem",
  border: `1px solid var(--border)`,
  borderRadius: "10px",
  background: "var(--panel-bg)",
  backdropFilter: "blur(8px)",
  maxWidth: "420px",
  margin: "2rem auto",
};

const emptyIconStyle = { fontSize: "2.5rem" };

const emptyTitleStyle = {
  fontFamily: "'Cinzel', serif",
  color: "var(--gold-light)",
  margin: 0,
  fontSize: "1.4rem",
};

const emptySubtextStyle = {
  color: "#9a8a70",
  margin: 0,
  fontSize: "1rem",
  fontStyle: "italic",
  textAlign: "center",
};

const primaryBtnStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "0.85rem",
  fontWeight: "600",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--bg-deep)",
  background: `linear-gradient(135deg, var(--gold), var(--gold-light))`,
  border: "none",
  borderRadius: "6px",
  padding: "0.7rem 1.8rem",
  cursor: "pointer",
  boxShadow: `0 2px 16px rgba(201,168,76,0.25)`,
  transition: "opacity 0.2s, transform 0.15s",
};

const loadingWrapStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "60vh",
  gap: "1rem",
  background: "var(--bg-deep)",
};

const runeSpinnerStyle = {
  fontSize: "2rem",
  color: "var(--gold)",
  animation: "spin 2s linear infinite",
};

const loadingTextStyle = {
  fontFamily: "'Crimson Text', serif",
  fontStyle: "italic",
  color: "#9a8a70",
  fontSize: "1.1rem",
};

export default CampaignsPage;