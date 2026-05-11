import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenText,
  Boxes,
  Compass,
  Map,
  ScrollText,
  UsersRound,
} from "lucide-react";
import mapIMG from "./images/home1.jpg";
import characterIMG from "./images/home2.jpg";
import campaignIMG from "./images/home3.jpg";
import partyFinderIMG from "./images/home4.jpg";
import assetFinderIMG from "./images/home5.jpg";
import compendiumIMG from "./images/home6.jpg";
import "./home.css";

const features = [
  {
    eyebrow: "Build the world",
    title: "Map Editor",
    description: "Sketch regions, frame encounters, and keep tactical spaces ready before the table asks what they see.",
    image: mapIMG,
    path: "/maps",
    icon: Map,
    meta: "Battlefields and regions",
    isFeatured: true,
  },
  {
    eyebrow: "Track the party",
    title: "Characters",
    description: "Manage heroes, sheets, inventory, and progression without scattering player details across tabs.",
    image: characterIMG,
    path: "/characters",
    icon: UsersRound,
    meta: "Roster and sheets",
  },
  {
    eyebrow: "Run the saga",
    title: "Campaigns",
    description: "Connect sessions, quests, NPCs, loot, and notes to the campaign they belong to.",
    image: campaignIMG,
    path: "/campaigns",
    icon: ScrollText,
    meta: "Sessions and journals",
  },
  {
    eyebrow: "Fill the table",
    title: "Party Finder",
    description: "Open a campaign to new players or find available tables when the next adventure needs a crew.",
    image: partyFinderIMG,
    path: "/party-finder",
    icon: Compass,
    meta: "Players and games",
  },
  {
    eyebrow: "Dress the scene",
    title: "Asset Library",
    description: "Browse tokens, tiles, props, and scene material that can give your maps more life.",
    image: assetFinderIMG,
    path: "/asset-finder",
    icon: Boxes,
    meta: "Tokens and props",
  },
  {
    eyebrow: "Reference rules",
    title: "Compendium",
    description: "Pull up rules, lore, and inspiration while planning or resolving a call at the table.",
    image: compendiumIMG,
    path: "/ruleset",
    icon: BookOpenText,
    meta: "Rules and lore",
  },
];

const workflow = [
  {
    number: "01",
    title: "Prepare",
    text: "Create the campaign, gather the roster, and shape the places your players will explore.",
  },
  {
    number: "02",
    title: "Play",
    text: "Move from planning into sessions, encounters, maps, character choices, and table flow.",
  },
  {
    number: "03",
    title: "Remember",
    text: "Carry forward what happened through journals, notes, quests, NPCs, loot, and party history.",
  },
];

function Home() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero-bg" aria-hidden="true" />
        <div className="home-hero-shell">
          <div className="home-hero-copy">
            <div className="hero-animate hero-animate-1 home-ornament-row">
              <span />
              <b>✦ ✦ ✦</b>
              <span />
            </div>

            <p className="hero-animate hero-animate-1 home-kicker">Welcome to</p>
            <h1 className="hero-animate hero-animate-2">Maps Unbound</h1>
            <p className="hero-animate hero-animate-3 home-hero-subtitle">
              A virtual tabletop workspace for building worlds, running campaigns, managing heroes, and keeping the story moving.
            </p>

            <div className="hero-animate hero-animate-4 home-hero-actions">
              <div className="home-hero-action-row">
                <Link to="/signup" className="hero-cta">Begin Your Journey</Link>
              </div>
              <div className="home-hero-action-row">
                <Link to="/login" className="home-secondary-link">Already a member? Sign in <ArrowRight size={14} /></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-suite">
        <div className="home-suite-header">
          <div>
            <h2>Everything after session zero</h2>
            <p>Move from idea to active campaign with tools that stay close to the way tabletop groups actually play.</p>
          </div>
        </div>

        <div className="home-suite-grid">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Link
                key={feature.title}
                to={feature.path}
                className={`home-feature-card ${feature.isFeatured ? "home-feature-card-large" : ""}`}
                style={{ backgroundImage: `url(${feature.image})` }}
              >
                <span className="home-feature-scrim" />
                <span className="home-feature-meta">
                  <Icon size={16} aria-hidden="true" />
                  {feature.meta}
                </span>
                <div className="home-feature-copy">
                  <p>{feature.eyebrow}</p>
                  <h3>{feature.title}</h3>
                  <span>{feature.description}</span>
                </div>
                <span className="home-feature-action">
                  Open <ArrowRight size={15} aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>

        <div className="home-play-strip">
          {workflow.map((step) => (
            <div key={step.number}>
              <span>{step.number}</span>
              <strong>{step.title}</strong>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default Home;
