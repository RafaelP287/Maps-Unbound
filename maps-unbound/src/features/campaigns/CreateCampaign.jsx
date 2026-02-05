import { useNavigate } from "react-router-dom";
import { useState } from "react";

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
        <div style={styles.container}>
            <h1>Create New Campaign</h1>
            <form onSubmit={handleSubmit} style={styles.form}>
                <label style={styles.label}>
                    Campaign Name:
                    <input
                        type="text"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        style={styles.input}
                        required
                    />
                </label>
                <label style={styles.label}>
                    Description:
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        style={styles.textarea}
                        required
                    />
                </label>
                <label style={styles.label}>
                    Players Needed:
                    <input
                        type="number"
                        value={playersNeeded}
                        onChange={(e) => setPlayersNeeded(e.target.value)}
                        style={styles.input}
                        min="0"
                        required
                    />
                </label>
                <button type="submit" style={styles.button}>Create Campaign</button>
            </form>
        </div>
    );
}

const styles = {
    container: {
        padding: '20px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        maxWidth: '400px',
    },
    label: {
        display: 'flex',
        flexDirection: 'column',
        fontSize: '16px',
    },
    input: {
        padding: '8px',
        fontSize: '14px',
        marginTop: '5px',
    },
    textarea: {
        padding: '8px',
        fontSize: '14px',
        marginTop: '5px',
        resize: 'vertical',
    },
    button: {
        padding: '10px',
        fontSize: '16px',
        backgroundColor: '#282c34',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
};

export default CreateCampaign;