import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Button from "../../shared/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

function CreateCampaignPage() {
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const [form, setForm] = useState({
        title: "",
        description: "",
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await fetch("/api/campaigns", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: form.title,
                    description: form.description,
                    members: [{ userId: user.id, role: "DM" }],
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
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        required
                        style={inputStyle}
                    />
                </label>

                <label style={labelStyle}>
                    Description:
                    <textarea
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        required
                        style={{ ...inputStyle, height: "100px" }}
                    />
                </label>

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
    gap: "0.5rem"
};

const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxWidth: "400px",
    margin: "0 auto"
};

const labelStyle = {
    display: "flex",
    flexDirection: "column",
    fontWeight: "bold"
};

const inputStyle = {
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    marginTop: "4px"
};

const errorStyle = {
    color: "red",
    textAlign: "center",
    maxWidth: "400px",
    margin: "0 auto"
};

export default CreateCampaignPage;