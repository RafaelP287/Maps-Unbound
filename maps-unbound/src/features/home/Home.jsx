import { Link } from "react-router-dom";
import mapIMG from "./images/home1.jpg";
import characterIMG from "./images/home2.jpg";
import campaignIMG from "./images/home3.jpg";
import partyFinderIMG from "./images/home4.jpg";

const services = [
  {
    title: "Map Editor",
    description: "Craft immersive worlds with our intuitive map editor — draw terrain, place landmarks, and bring your realm to life.",
    image: mapIMG,
    path: "/maps",
  },
  {
    title: "Character Management",
    description: "Forge heroes and track their legend with comprehensive character sheets, inventory, and progression tools.",
    image: characterIMG,
    path: "/characters",
  },
  {
    title: "Campaign Management",
    description: "Orchestrate your saga — organize sessions, track party progress, and chronicle every chapter of your adventure.",
    image: campaignIMG,
    path: "/campaigns",
  },
  {
    title: "Party Finder",
    description: "Venture forth together. Find fellow adventurers, assemble a party, or open your table to new heroes.",
    image: partyFinderIMG,
    path: "/party-finder",
  },
];

function Home() {
  return (
    <div style={pageStyle}>

      {/* ── Hero ── */}
      <section style={heroStyle}>
        <div style={heroInnerStyle}>
          {/* Ornamental top line */}
          <div className="hero-animate hero-animate-1" style={ornamentRowStyle}>
            <div style={ornamentLineStyle} />
            <span style={ornamentRuneStyle}>✦ ✦ ✦</span>
            <div style={ornamentLineStyle} />
          </div>

          <p className="hero-animate hero-animate-1" style={welcomeTextStyle}>
            Welcome to
          </p>

          <h1 className="hero-animate hero-animate-2" style={heroTitleStyle}>
            Maps Unbound
          </h1>

          <p className="hero-animate hero-animate-3" style={heroSubtextStyle}>
            Your personal virtual tabletop RPG destination — forge worlds, build legends, and gather your party.
          </p>

          <div className="hero-animate hero-animate-4" style={heroCtaWrapStyle}>
            <Link to="/signup" className="hero-cta">
              Begin Your Journey
            </Link>
            <Link to="/login" style={secondaryCtaStyle}>
              Already a member? Sign in →
            </Link>
          </div>

          {/* Ornamental bottom line */}
          <div className="hero-animate hero-animate-4" style={{ ...ornamentRowStyle, marginTop: "3rem" }}>
            <div style={ornamentLineStyle} />
            <span style={ornamentRuneStyle}>✦</span>
            <div style={ornamentLineStyle} />
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section style={servicesStyle}>
        <div style={sectionHeaderStyle}>
          <div style={sectionDivStyle} />
          <h2 style={sectionTitleStyle}>What Awaits You</h2>
          <div style={sectionDivStyle} />
        </div>
        <p style={sectionSubtextStyle}>
          Everything you need to run, play, and chronicle your tabletop adventures.
        </p>

        <div style={cardsWrapStyle}>
          {services.map((service) => (
            <Link
              key={service.title}
              to={service.path}
              className="service-card"
              style={{ backgroundImage: `url(${service.image})`, textDecoration: "none" }}
            >
              {/* Scrim */}
              <div
                className="service-card-overlay"
                style={cardOverlayStyle}
              />
              {/* Content */}
              <div style={cardContentStyle}>
                <div style={cardHeaderRowStyle}>
                  <h3 style={cardTitleStyle}>{service.title}</h3>
                </div>
                <p style={cardDescStyle}>{service.description}</p>
                <span style={cardLinkStyle}>Explore →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── Styles ── */
const pageStyle = {
  minHeight: "100vh",
};

/* Hero */
const heroStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "92vh",
  padding: "6rem 2rem 4rem",
  textAlign: "center",
};

const heroInnerStyle = {
  maxWidth: "680px",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "1rem",
};

const ornamentRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  width: "100%",
  maxWidth: "420px",
};

const ornamentLineStyle = {
  flex: 1,
  height: "1px",
  background: `linear-gradient(to right, transparent, rgba(201,168,76,0.4))`,
};

const ornamentRuneStyle = {
  color: "var(--gold)",
  fontSize: "0.7rem",
  letterSpacing: "0.5em",
  opacity: 0.6,
};

const welcomeTextStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "0.9rem",
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: "var(--gold)",
  margin: 0,
  opacity: 0.8,
};

const heroTitleStyle = {
  fontFamily: "'Cinzel Decorative', serif",
  fontSize: "clamp(2.5rem, 8vw, 5rem)",
  color: "var(--gold-light)",
  margin: 0,
  letterSpacing: "0.04em",
  textShadow: `0 0 60px rgba(201,168,76,0.25), 0 2px 4px rgba(0,0,0,0.8)`,
  lineHeight: 1.1,
};

const heroSubtextStyle = {
  fontFamily: "'Crimson Text', serif",
  fontSize: "1.2rem",
  fontStyle: "italic",
  color: "#b0a08a",
  maxWidth: "500px",
  margin: 0,
  lineHeight: 1.6,
};

const heroCtaWrapStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "1rem",
  marginTop: "0.5rem",
};

const secondaryCtaStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "0.72rem",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#7a6e5e",
  textDecoration: "none",
  transition: "color 0.2s",
};

/* Services section */
const servicesStyle = {
  padding: "2rem 2rem 6rem",
  maxWidth: "960px",
  margin: "0 auto",
};

const sectionHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  marginBottom: "0.6rem",
};

const sectionDivStyle = {
  flex: 1,
  height: "1px",
  background: `linear-gradient(to right, transparent, rgba(201,168,76,0.3))`,
};

const sectionTitleStyle = {
  fontFamily: "'Cinzel Decorative', serif",
  fontSize: "clamp(1.2rem, 3vw, 1.7rem)",
  color: "var(--gold-light)",
  margin: 0,
  whiteSpace: "nowrap",
  textShadow: `0 0 30px rgba(201,168,76,0.15)`,
};

const sectionSubtextStyle = {
  fontFamily: "'Crimson Text', serif",
  fontStyle: "italic",
  color: "#7a6e5e",
  textAlign: "center",
  marginBottom: "2.5rem",
};

const cardsWrapStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  alignItems: "center",
};

/* Card */
const cardOverlayStyle = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(to top, rgba(8,6,3,0.92) 0%, rgba(8,6,3,0.4) 55%, transparent 100%)",
  transition: "background 0.3s",
};

const cardContentStyle = {
  position: "relative",
  zIndex: 1,
  padding: "1.5rem 2rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.4rem",
};

const cardHeaderRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.7rem",
};

const cardTitleStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "1.1rem",
  fontWeight: "700",
  color: "var(--gold-light)",
  margin: 0,
  letterSpacing: "0.06em",
};

const cardDescStyle = {
  fontFamily: "'Crimson Text', serif",
  fontSize: "1rem",
  color: "#b0a08a",
  fontStyle: "italic",
  margin: 0,
  lineHeight: 1.5,
  maxWidth: "560px",
};

const cardLinkStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "0.68rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--gold)",
  marginTop: "0.25rem",
};

export default Home;