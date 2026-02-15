import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Button from "../../shared/Button.jsx";

function CreateCampaignPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        title: "",
        description: "",
        members: []
    });

    const handleSubmit = () => {
        navigate("/campaigns");
    };

    return (
        <>
            <div style={headerStyle}>
                <h1>Create New Campaign</h1>
                <p>Start a new adventure!</p>
            </div>

            <form onSubmit={handleSubmit} style={formStyle}>
                <label style={labelStyle}>
                    Campaign Title:
                    <input 
                        type="text" 
                        value={form.title} 
                        onChange={e => setForm({...form, title: e.target.value})} 
                        required 
                        style={inputStyle}
                    />
                </label>

                <label style={labelStyle}>
                    Description:
                    <textarea 
                        value={form.description} 
                        onChange={e => setForm({...form, description: e.target.value})} 
                        required 
                        style={{...inputStyle, height: "100px"}}
                    />
                </label>

                <Button type="submit" primary>Create Campaign</Button>
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

export default CreateCampaignPage;