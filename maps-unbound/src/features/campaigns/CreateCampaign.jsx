import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import Button from "../../shared/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

function CreateCampaignPage() {
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const [form, setForm] = useState({ title: "", description: "" });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // Player search state
    const [playerSearch, setPlayerSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [players, setPlayers] = useState([]); // added players: [{ userId, username }]
    const searchTimeout = useRef(null);

    // Debounced search
    useEffect(() => {
        if (playerSearch.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await fetch(
                    `/api/campaigns/users/search?username=${encodeURIComponent(playerSearch)}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const data = await res.json();
                if (res.ok) {
                    // Filter out users already added
                    const addedIds = players.map((p) => p.userId);
                    setSearchResults(data.filter((u) => !addedIds.includes(u._id)));
                }
            } catch {
                // silently fail — not critical
            } finally {
                setSearchLoading(false);
            }
        }, 300);

        return () => clearTimeout(searchTimeout.current);
    }, [playerSearch, players, token]);

    const addPlayer = (u) => {
        setPlayers((prev) => [...prev, { userId: u._id, username: u.username }]);
        setPlayerSearch("");
        setSearchResults([]);
    };

    const removePlayer = (userId) => {
        setPlayers((prev) => prev.filter((p) => p.userId !== userId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const members = [
            { userId: user.id, role: "DM" },
            ...players.map((p) => ({ userId: p.userId, role: "Player" })),
        ];

        try {
            const response = await fetch("/api/campaigns", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: form.title,
                    description: form.description,
                    members,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to create campaign");
            }

            navigate("/campaigns");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div style={headerStyle}>
                <h1>Create New Campaign</h1>
                <p>Start a new adventure!</p>
            </div>

            {error && <p style={errorStyle}>{error}</p>}

            <form onSubmit={handleSubmit} style={formStyle}>
                <label style={labelStyle}>
                    Campaign Title:
                    <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        required
                        style={inputStyle}
                    />
                </label>

                <label style={labelStyle}>
                    Description:
                    <textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        required
                        style={{ ...inputStyle, height: "100px" }}
                    />
                </label>

                {/* Player search */}
                <div>
                    <span style={labelStyle}>Add Players:</span>

                    <div style={searchWrapperStyle}>
                        <input
                            type="text"
                            placeholder="Search by username..."
                            value={playerSearch}
                            onChange={(e) => setPlayerSearch(e.target.value)}
                            style={inputStyle}
                            autoComplete="off"
                        />
                        {searchLoading && (
                            <p style={searchHintStyle}>Searching...</p>
                        )}
                        {!searchLoading && searchResults.length > 0 && (
                            <ul style={dropdownStyle}>
                                {searchResults.map((u) => (
                                    <li
                                        key={u._id}
                                        style={dropdownItemStyle}
                                        onClick={() => addPlayer(u)}
                                    >
                                        {u.username}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {!searchLoading &&
                            playerSearch.trim().length >= 2 &&
                            searchResults.length === 0 && (
                                <p style={searchHintStyle}>No users found.</p>
                            )}
                    </div>

                    {/* Added players list */}
                    {players.length > 0 && (
                        <ul style={playerListStyle}>
                            {players.map((p) => (
                                <li key={p.userId} style={playerTagStyle}>
                                    <span>{p.username}</span>
                                    <button
                                        type="button"
                                        onClick={() => removePlayer(p.userId)}
                                        style={removeButtonStyle}
                                        aria-label={`Remove ${p.username}`}
                                    >
                                        ✕
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <Button type="submit" primary disabled={loading}>
                    {loading ? "Creating..." : "Create Campaign"}
                </Button>
            </form>
        </>
    );
}

/* Styles */
const headerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "1rem",
    gap: "0.5rem",
};

const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxWidth: "400px",
    margin: "0 auto",
};

const labelStyle = {
    display: "flex",
    flexDirection: "column",
    fontWeight: "bold",
};

const inputStyle = {
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    marginTop: "4px",
    width: "100%",
    boxSizing: "border-box",
};

const errorStyle = {
    color: "red",
    textAlign: "center",
    maxWidth: "400px",
    margin: "0 auto",
};

const searchWrapperStyle = {
    position: "relative",
    marginTop: "4px",
};

const dropdownStyle = {
    listStyle: "none",
    margin: "0",
    padding: "0",
    border: "1px solid #ccc",
    borderRadius: "4px",
    backgroundColor: "#fff",
    position: "absolute",
    width: "100%",
    zIndex: 10,
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
};

const dropdownItemStyle = {
    padding: "8px 12px",
    cursor: "pointer",
    borderBottom: "1px solid #eee",
    color: "#111"
};

const searchHintStyle = {
    fontSize: "0.85rem",
    color: "#666",
    margin: "4px 0 0",
};

const playerListStyle = {
    listStyle: "none",
    padding: "0",
    margin: "8px 0 0",
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
};

const playerTagStyle = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#e8f0fe",
    border: "1px solid #c5d8fc",
    borderRadius: "20px",
    padding: "4px 10px",
    fontSize: "0.9rem",
    color: "#111"
};

const removeButtonStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#555",
    fontSize: "0.8rem",
    padding: "0",
    lineHeight: 1,
};

export default CreateCampaignPage;