import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import useCampaign from "../campaigns/use-campaign.js";
import LoadingPage from "../../shared/Loading.jsx";
import "./session.css";

function SessionPlayerView() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get("campaignId");
  const sessionId = searchParams.get("sessionId");
  const sessionNameParam = searchParams.get("sessionName") || "Session";
  const { campaign, loading: campaignLoading } = useCampaign(campaignId);
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(Boolean(sessionId));
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const bootTimeoutRef = useRef(null);

  const bootToCampaign = (message) => {
    if (bootTimeoutRef.current) return;
    setNotice(message);
    setError("");
    bootTimeoutRef.current = window.setTimeout(() => {
      navigate(campaignId ? `/campaigns/${campaignId}` : "/campaigns");
    }, 3000);
  };

  const fetchSession = async ({ showLoading = true } = {}) => {
    if (!sessionId || !token) {
      setLoadingSession(false);
      return;
    }

    if (showLoading) setLoadingSession(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 404) {
          bootToCampaign("The session is no longer available. Returning you to the campaign...");
          return;
        }
        throw new Error(data.error || "Failed to load session");
      }

      const data = await res.json();
      if (["Completed", "Archived"].includes(data.status)) {
        bootToCampaign("The DM ended this session. Returning you to the campaign...");
        return;
      }
      setSession(data);
    } catch (err) {
      setError(err.message || "Failed to load session.");
    } finally {
      setLoadingSession(false);
    }
  };

  useEffect(() => {
    fetchSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, token]);

  useEffect(() => {
    if (!sessionId || !token || notice) return;

    const intervalId = window.setInterval(() => {
      fetchSession({ showLoading: false });
    }, 4000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, token, notice]);

  useEffect(() => {
    return () => {
      if (bootTimeoutRef.current) window.clearTimeout(bootTimeoutRef.current);
    };
  }, []);

  if (campaignLoading || loadingSession) {
    return <LoadingPage>Joining the session...</LoadingPage>;
  }

  return (
    <div className="session-page">
      <main className="session-player">
        <header className="session-player__header">
          <p className="session-lobby__eyebrow">Player Session</p>
          <h1>{session?.title || sessionNameParam}</h1>
          <p>{campaign?.title || "Campaign"}</p>
        </header>

        {notice && (
          <div className="session-boot-overlay" role="status" aria-live="assertive">
            <div className="session-boot-overlay__card">
              <p className="session-lobby__eyebrow">Session Closed</p>
              <h2>Returning to Campaign</h2>
              <p>{notice}</p>
            </div>
          </div>
        )}

        {error && <p className="session-lobby__error">{error}</p>}

        <section className="session-player__panel">
          <h2>Session View Coming Soon</h2>
          <p>
            You are in the live session. The player map, character controls, dice, and table updates will appear here.
          </p>
          <Link to={`/campaigns/${campaignId}`} className="session-lobby__button session-lobby__button--ghost">
            Back to Campaign
          </Link>
        </section>
      </main>
    </div>
  );
}

export default SessionPlayerView;
