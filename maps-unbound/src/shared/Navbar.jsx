import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isLoggedIn, loading } = useAuth();

  const handleLogout = () => { logout(); navigate("/"); };

  if (loading) return null;

  const isActive = (path) => location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <nav style={navStyle}>
      {/* Left — Brand */}
      <Link to="/" style={{ textDecoration: "none" }}>
        <div style={brandStyle}>
          <span style={brandRuneStyle}>✦</span>
          <span style={brandTextStyle}>Maps Unbound</span>
        </div>
      </Link>

      {/* Right — Links */}
      <div style={linksStyle}>
        {isLoggedIn ? (
          <>
            <Link to="/" className={isActive("/")}>Home</Link>
            <Link to="/maps" className={isActive("/maps")}>Maps</Link>
            <Link to="/characters" className={isActive("/characters")}>Characters</Link>
            <Link to="/campaigns" className={isActive("/campaigns")}>Campaigns</Link>
            <Link to="/party-finder" className={isActive("/party-finder")}>Party Finder</Link>

            <div style={dividerStyle} />

            <Link to="/profile" className="nav-user-link">
              <span style={avatarStyle}>
                {user.username[0].toUpperCase()}
              </span>
              {user.username[0].toUpperCase() + user.username.slice(1)}
            </Link>

            <button className="nav-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="nav-signin-btn">
            Enter the Realm
          </Link>
        )}
      </div>
    </nav>
  );
}

const navStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 2rem",
  height: "60px",
  background: navBg,
  borderBottom: `1px solid ${borderColor}`,
  backdropFilter: "blur(12px)",
  boxShadow: "0 2px 24px rgba(0,0,0,0.5)",
};

const brandStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
};

const brandRuneStyle = {
  color: gold,
  fontSize: "1rem",
  opacity: 0.8,
};

const brandTextStyle = {
  fontFamily: "'Cinzel Decorative', serif",
  fontSize: "1.1rem",
  color: "#e8c96a",
  letterSpacing: "0.04em",
  textShadow: "0 0 20px rgba(201,168,76,0.2)",
};

const linksStyle = {
  display: "flex",
  alignItems: "center",
  gap: "1.5rem",
};

const dividerStyle = {
  width: "1px",
  height: "18px",
  background: borderColor,
};

const avatarStyle = {
  width: "26px",
  height: "26px",
  borderRadius: "50%",
  background: "rgba(201,168,76,0.15)",
  border: `1px solid rgba(201,168,76,0.4)`,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.7rem",
  fontFamily: "'Cinzel', serif",
  color: gold,
  flexShrink: 0,
};

export default Navbar;