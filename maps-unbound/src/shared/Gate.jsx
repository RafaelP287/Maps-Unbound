// FOR WHEN USER IS NOT LOGGED IN.
import { Link } from "react-router-dom"

function Gate({ children }) {
    return (
        <div style={gateStyle}>
            <div style={gatePanelStyle}>
                <div style={runeAccentStyle}>⚔</div>
                <h2 style={gateTitleStyle}>The Gates Are Sealed</h2>
                <p style={gateSubtextStyle}>{ children }</p>
                <Link to="/login">
                    <button style={primaryBtnStyle}>Enter the Realm</button>
                </Link>
            </div>
        </div>
    );
}

/* Styles */
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

const gateStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg-deep)",
};

const gatePanelStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "1rem",
  padding: "3rem 2.5rem",
  border: `1px solid var(--border)`,
  borderRadius: "12px",
  background: "var(--panel-bg)",
  textAlign: "center",
  maxWidth: "380px",
};

const runeAccentStyle = {
  fontSize: "2rem",
  color: "var(--gold)",
};

const gateTitleStyle = {
  fontFamily: "'Cinzel', serif",
  color: "var(--gold-light)",
  margin: 0,
  fontSize: "1.6rem",
};

const gateSubtextStyle = {
  color: "#9a8a70",
  fontStyle: "italic",
  margin: "0 0 0.5rem",
};

export default Gate;