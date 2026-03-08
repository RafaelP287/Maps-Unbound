function LoadingPage({ children }) {
    return (
        <div style={loadingWrapStyle}>
            <div style={runeSpinnerStyle}>✦</div>
            <p style={loadingTextStyle}>{ children }</p>
        </div>
    )
}

/* Styles */
const loadingWrapStyle = {
  minHeight: "75vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg-deep)",
  gap: "1rem",
};

const loadingTextStyle = {
  fontFamily: "'Crimson Text', serif",
  fontStyle: "italic",
  color: "#9a8a70",
  fontSize: "1.1rem",
};

const runeSpinnerStyle = {
  fontSize: "2rem",
  color: "var(--gold)",
  animation: "spin 2s linear infinite",
};

export default LoadingPage;