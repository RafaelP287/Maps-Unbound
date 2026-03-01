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

    // Image state
    const [imagePreview, setImagePreview] = useState(null); // base64 string
    const [imageError, setImageError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Player search state
    const [playerSearch, setPlayerSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [players, setPlayers] = useState([]);
    const searchTimeout = useRef(null);

    // Debounced player search
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
                    const addedIds = players.map((p) => p.userId);
                    setSearchResults(data.filter((u) => !addedIds.includes(u._id)));
                }
            } catch {
                // silently fail
            } finally {
                setSearchLoading(false);
            }
        }, 300);

        return () => clearTimeout(searchTimeout.current);
    }, [playerSearch, players, token]);

    const processImageFile = (file) => {
        setImageError(null);

        if (!file.type.startsWith("image/")) {
            setImageError("Please upload an image file.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setImageError("Image must be under 10MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processImageFile(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleFileInput = (e) => {
        const file = e.target.files[0];
        if (file) processImageFile(file);
    };

    const removeImage = () => {
        setImagePreview(null);
        setImageError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

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
                    image: imagePreview ?? undefined,
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

                {/* Campaign Image */}
                <div>
                    <span style={labelStyle}>Campaign Image:</span>

                    {imagePreview ? (
                        <div style={previewWrapperStyle}>
                            <img src={imagePreview} alt="Campaign preview" style={previewImageStyle} />
                            <button type="button" onClick={removeImage} style={removeImageButtonStyle}>
                                ✕ Remove
                            </button>
                        </div>
                    ) : (
                        <div
                            style={dropZoneStyle(isDragging)}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <span style={dropZoneIconStyle}>🖼️</span>
                            <p style={dropZoneLabelStyle}>
                                Drag & drop an image here, or <u>click to browse</u>
                            </p>
                            <p style={dropZoneHintStyle}>PNG, JPG, WEBP — max 10MB</p>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileInput}
                        style={{ display: "none" }}
                    />

                    {imageError && <p style={imageErrorStyle}>{imageError}</p>}
                </div>

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
                        {searchLoading && <p style={searchHintStyle}>Searching...</p>}
                        {!searchLoading && searchResults.length > 0 && (
                            <ul style={dropdownStyle}>
                                {searchResults.map((u) => (
                                    <li key={u._id} style={dropdownItemStyle} onClick={() => addPlayer(u)}>
                                        {u.username}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {!searchLoading && playerSearch.trim().length >= 2 && searchResults.length === 0 && (
                            <p style={searchHintStyle}>No users found.</p>
                        )}
                    </div>

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
    color: "#111",
};

const errorStyle = {
    color: "red",
    textAlign: "center",
    maxWidth: "400px",
    margin: "0 auto",
};

const dropZoneStyle = (isDragging) => ({
    marginTop: "6px",
    border: `2px dashed ${isDragging ? "#4a7fd4" : "#aaa"}`,
    borderRadius: "8px",
    padding: "24px 16px",
    textAlign: "center",
    cursor: "pointer",
    backgroundColor: isDragging ? "#eef3fc" : "transparent",
    transition: "border-color 0.2s, background-color 0.2s",
});

const dropZoneIconStyle = {
    fontSize: "2rem",
};

const dropZoneLabelStyle = {
    margin: "8px 0 4px",
    fontSize: "0.9rem",
    color: "#fff",
};

const dropZoneHintStyle = {
    margin: 0,
    fontSize: "0.78rem",
    color: "#fff",
};

const previewWrapperStyle = {
    marginTop: "6px",
    position: "relative",
    display: "inline-block",
    width: "100%",
};

const previewImageStyle = {
    width: "100%",
    maxHeight: "180px",
    objectFit: "cover",
    borderRadius: "8px",
    display: "block",
};

const removeImageButtonStyle = {
    marginTop: "6px",
    background: "none",
    border: "1px solid #ccc",
    borderRadius: "4px",
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: "0.85rem",
    color: "#fff",
};

const imageErrorStyle = {
    color: "red",
    fontSize: "0.85rem",
    marginTop: "4px",
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
    color: "#111",
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
    color: "#111",
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