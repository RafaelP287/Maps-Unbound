import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Button from "../../shared/Button.jsx";

function CreateCampaign() {
    const navigate = useNavigate();
    const [campaignName, setCampaignName] = useState("");
    const [description, setDescription] = useState("");
    const [playersNeeded, setPlayersNeeded] = useState(0);
    
    const handleSubmit = (e) => {
        e.preventDefault();
        // Here you would typically send the data to your backend
        console.log({ campaignName, description, playersNeeded });
        // After creation, navigate to the campaigns page
        navigate("/campaigns");
    }
    return (
        <>
            <div style={styles.header}>
                <h1>Create New Campaign</h1>
                <p>Fill out the details below to create your campaign.</p>
            </div>
            <div style={styles.formContainer}>
                <form onSubmit={handleSubmit} style={styles.form}>
                    <label style={styles.label}>
                        Campaign Name:
                        <input type="text" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} style={styles.input} required />
                    </label>
                    <label style={styles.label}>
                        Description:
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={styles.textarea} required />
                    </label>
                    <label style={styles.label}>
                        Players Needed:
                        <input type="number" value={playersNeeded} onChange={(e) => setPlayersNeeded(e.target.value)} style={styles.input} min="1" required />
                    </label>
                    <Button type="submit">Create Campaign</Button>
                </form>
            </div>
        </>
    );
}

const styles = {
    header: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px"
    },
    formContainer: {
        display: "flex",
        justifyContent: "center",
        padding: "16px"
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "100%",
        maxWidth: "400px"
    },
    label: {
        display: "flex",
        flexDirection: "column",
        fontSize: "14px",
        fontWeight: "bold"
    },
    input: {
        padding: "8px",
        fontSize: "14px",
        borderRadius: "4px",
        border: "1px solid #ccc"
    },
    textarea: {
        padding: "8px",
        fontSize: "14px",
        borderRadius: "4px",
        border: "1px solid #ccc",
        resize: "vertical"
    }
};

export default CreateCampaign;