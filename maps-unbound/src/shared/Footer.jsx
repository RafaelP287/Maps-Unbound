function Footer() {
  return (
    <footer style={footerStyle}>
      <div style={footerInnerStyle}>
        <div style={dividerStyle} />
        <div style={footerContentStyle}>
          <span style={runeStyle}>✦</span>
          <p style={textStyle}>© 2026 Maps Unbound — All rights reserved.</p>
          <span style={runeStyle}>✦</span>
        </div>
      </div>
    </footer>
  );
}

const footerStyle = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  width: "100%",
  background: "rgba(10, 8, 5, 0.96)",
  borderTop: `1px solid var(--border)`,
  backdropFilter: "blur(12px)",
  boxShadow: "0 -2px 24px rgba(0,0,0,0.4)",
  zIndex: 1000,
};

const footerInnerStyle = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "0 2rem",
};

const dividerStyle = {
  height: "1px",
  background: `linear-gradient(to right, transparent, var(--border), transparent)`,
  marginBottom: "0",
};

const footerContentStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.75rem",
  padding: "0.65rem 0",
};

const runeStyle = {
  color: "var(--gold)",
  fontSize: "0.7rem",
  opacity: 0.5,
};

const textStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "0.65rem",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#6a5e50",
  margin: 0,
};

export default Footer;