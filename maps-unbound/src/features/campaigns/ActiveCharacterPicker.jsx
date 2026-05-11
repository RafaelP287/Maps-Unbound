import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

const API_SERVER = import.meta.env.VITE_API_SERVER || "";

// ─── ActiveCharacterPicker ────────────────────────────────────────────────
// Shows a "Playing as" dropdown for Player members of a campaign. Picking a
// character writes to Campaign.members[me].activeCharacterId, which the DM's
// combat setup uses to pull exactly one character per player.
//
// Props:
//   campaign — the populated campaign doc (with members.userId populated)
//   user     — current user (from useAuth, has .id, .username)
//
function ActiveCharacterPicker({ campaign, user }) {
    const { token } = useAuth();
    const [myCharacters, setMyCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");

    // Find the current user's membership row in the campaign.
    const myMembership = campaign?.members?.find(
        (m) => (m.userId?._id || m.userId)?.toString() === user?.id?.toString()
    );

    // Fetch the user's characters once.
    useEffect(() => {
        if (!user?.username) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        const fetchCharacters = async () => {
            try {
                const res = await fetch(
                    `${API_SERVER}/api/users/${user.username}/characters`
                );
                if (!res.ok) throw new Error("Failed to load your characters");
                const data = await res.json();
                if (!cancelled) {
                    setMyCharacters(Array.isArray(data.characters) ? data.characters : []);
                }
            } catch (err) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchCharacters();
        return () => {
            cancelled = true;
        };
    }, [user?.username]);

    // Track the active character locally so the dropdown reflects changes
    // immediately without needing a parent refetch / page reload. We give
    // it a safe default — the early-return below means non-players don't
    // actually use it, but the hook MUST be called every render.
    const [activeId, setActiveId] = useState(
        myMembership?.activeCharacterId?.toString() || ""
    );

    // If the parent campaign reloads with a different value, sync to it.
    useEffect(() => {
        setActiveId(myMembership?.activeCharacterId?.toString() || "");
    }, [myMembership?.activeCharacterId]);

    // Only Players see this picker — DM doesn't pick a character for themselves.
    if (!myMembership || myMembership.role !== "Player") {
        return null;
    }

    const handleChange = async (event) => {
        const characterId = event.target.value || null;
        setError("");
        setStatus("");
        setSaving(true);
        try {
            const res = await fetch(
                `${API_SERVER}/api/campaigns/${campaign._id}/active-character`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ characterId }),
                }
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to update character");
            }
            setStatus("Saved.");
            // Update local state so the dropdown reflects the new pick instantly.
            // (Also mutate the membership row so the warning state recomputes.)
            setActiveId(characterId || "");
            myMembership.activeCharacterId = characterId;
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const needsToPick = !activeId && myCharacters.length > 0;

    return (
        <div
            className={[
                "campaign-active-character-picker",
                needsToPick ? "is-warning" : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <div className="campaign-active-character-picker__inner">
                <span className="campaign-active-character-picker__label">
                    {needsToPick ? "⚠ Pick your character:" : "Playing as:"}
                </span>
                {loading ? (
                    <span className="campaign-active-character-picker__hint">Loading characters…</span>
                ) : myCharacters.length === 0 ? (
                    <span className="campaign-active-character-picker__hint">
                        Create a character first to play in this campaign.
                    </span>
                ) : (
                    <select
                        className="campaign-active-character-picker__select"
                        value={activeId}
                        onChange={handleChange}
                        disabled={saving}
                    >
                        <option value="">— No character selected —</option>
                        {myCharacters.map((char) => (
                            <option key={char._id} value={char._id}>
                                {char.name} (Lv {char.level || 1} {char.race?.name || ""} {char.class?.name || ""})
                            </option>
                        ))}
                    </select>
                )}
                {error && <span className="campaign-active-character-picker__error">{error}</span>}
                {status && !error && (
                    <span className="campaign-active-character-picker__status">{status}</span>
                )}
            </div>
            {needsToPick && (
                <p className="campaign-active-character-picker__warning-text">
                    Your DM can't include you in combat until you pick a character.
                </p>
            )}
        </div>
    );
}

export default ActiveCharacterPicker;