import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import Button from "../../shared/Button.jsx";

function CreateCampaignPage() {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [form, setForm] = useState({
        title: "",
        description: ""
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("http://localhost:5001/api/campaigns", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(form)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to create campaign");
            }

            const data = await response.json();
            console.log("Campaign created successfully:", data);
            navigate("/campaigns");
        } catch (err) {
            console.error("Campaign creation error:", err);
            setError(err.message || "Failed to create campaign. Please try again.");
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

            {error && <div style={errorStyle}>{error}</div>}

            <form onSubmit={handleSubmit} style={formStyle}>
                <label style={labelStyle}>
                    Campaign Title:
                    <input 
                        type="text" 
                        value={form.title} 
                        onChange={e => setForm({...form, title: e.target.value})} 
                        required 
                        style={inputStyle}
                        placeholder="Enter campaign title"
                    />
                </label>

                <label style={labelStyle}>
                    Description:
                    <textarea 
                        value={form.description} 
                        onChange={e => setForm({...form, description: e.target.value})} 
                        required 
                        style={{...inputStyle, height: "100px"}}
                        placeholder="Describe your campaign"
                    />
                </label>

                <div style={buttonGroupStyle}>
                    <button type="button" onClick={() => navigate("/campaigns")} style={cancelButtonStyle}>
                        Cancel
                    </button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Creating..." : "Create Campaign"}
                    </Button>
                </div>
            </form>
        </>
    )
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
    backgroundColor: "#ff4444",
    color: "#fff",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "20px",
    textAlign: "center",
    margin: "20px auto",
    maxWidth: "400px"
};

const buttonGroupStyle = {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    marginTop: "1rem"
};

const cancelButtonStyle = {
    padding: "8px 20px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    backgroundColor: "#333",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px"
};

export default CreateCampaignPage;