import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

const AUTH_STORAGE_KEY = "maps-unbound-auth";

function Profile() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [characters, setCharacters] = useState([]);
    const [activeTab, setActiveTab] = useState('campaigns');

    useEffect(() => {
        const authData = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!authData) {
            navigate('/login');
            return;
        }

        const loadData = async () => {
            try {
                const { user } = JSON.parse(authData);
                setUser(user);
                
                // Load user data
                // TODO: Replace with actual API calls
                setCampaigns([
                    { id: 1, name: "Dragons of the North", players: 4, lastPlayed: "2026-02-07" },
                    { id: 2, name: "Curse of Strahd", players: 5, lastPlayed: "2026-02-05" },
                ]);

                setCharacters([
                    { id: 1, name: "Elara Moonwhisper", class: "Wizard", level: 5, campaign: "Dragons of the North" },
                    { id: 2, name: "Thorin Ironforge", class: "Fighter", level: 6, campaign: "Curse of Strahd" },
                ]);
            } catch (error) {
                console.error("Failed to load user data:", error);
                navigate('/login');
            }
        };

        loadData();
    }, [navigate]);

    if (!user) {
        return <div style={styles.loading}>Loading...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1>Welcome, {user.username.charAt(0).toUpperCase() + user.username.slice(1).toLowerCase()}!</h1>
                <p style={styles.email}>{user.email}</p>
            </div>

            <div style={styles.tabs}>
                <button
                    onClick={() => setActiveTab('campaigns')}
                    style={activeTab === 'campaigns' ? styles.activeTab : styles.tab}
                >
                    My Campaigns
                </button>
                <button
                    onClick={() => setActiveTab('characters')}
                    style={activeTab === 'characters' ? styles.activeTab : styles.tab}
                >
                    My Characters
                </button>
            </div>

            {activeTab === 'campaigns' && (
                <div style={styles.content}>
                    <div style={styles.sectionHeader}>
                        <h2>Campaigns</h2>
                        <Link to="/create-campaign">
                            <button style={styles.createButton}>+ Create Campaign</button>
                        </Link>
                    </div>
                    
                    {campaigns.length === 0 ? (
                        <p style={styles.empty}>No campaigns yet. Create your first one!</p>
                    ) : (
                        <div style={styles.grid}>
                            {campaigns.map(campaign => (
                                <div key={campaign.id} style={styles.card}>
                                    <h3 style={styles.cardTitle}>{campaign.name}</h3>
                                    <p>Players: {campaign.players}</p>
                                    <p>Last Played: {campaign.lastPlayed}</p>
                                    <button style={styles.viewButton}>View Campaign</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'characters' && (
                <div style={styles.content}>
                    <div style={styles.sectionHeader}>
                        <h2>Character Sheets</h2>
                        <button style={styles.createButton}>+ Create Character</button>
                    </div>
                    
                    {characters.length === 0 ? (
                        <p style={styles.empty}>No characters yet. Create your first one!</p>
                    ) : (
                        <div style={styles.grid}>
                            {characters.map(character => (
                                <div key={character.id} style={styles.card}>
                                    <h3 style={styles.cardTitle}>{character.name}</h3>
                                    <p>Class: {character.class}</p>
                                    <p>Level: {character.level}</p>
                                    <p style={styles.campaignTag}>{character.campaign}</p>
                                    <button style={styles.viewButton}>View Sheet</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px',
    },
    loading: {
        textAlign: 'center',
        padding: '100px 20px',
        fontSize: '18px',
    },
    header: {
        textAlign: 'center',
        marginBottom: '40px',
    },
    email: {
        color: '#666',
        fontSize: '14px',
    },
    tabs: {
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        borderBottom: '2px solid #333',
    },
    tab: {
        background: 'none',
        border: 'none',
        padding: '12px 24px',
        fontSize: '16px',
        cursor: 'pointer',
        color: '#666',
        borderBottom: '3px solid transparent',
    },
    activeTab: {
        background: 'none',
        border: 'none',
        padding: '12px 24px',
        fontSize: '16px',
        cursor: 'pointer',
        color: '#00FFFF',
        borderBottom: '3px solid #00FFFF',
        fontWeight: 'bold',
    },
    content: {
        marginTop: '20px',
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    createButton: {
        background: '#00FFFF',
        color: '#111',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px',
    },
    card: {
        background: '#1a1a1a',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #333',
    },
    cardTitle: {
        color: '#00FFFF',
        marginTop: 0,
        marginBottom: '15px',
    },
    campaignTag: {
        fontSize: '12px',
        color: '#888',
        fontStyle: 'italic',
    },
    viewButton: {
        background: '#333',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        width: '100%',
        marginTop: '10px',
    },
    empty: {
        textAlign: 'center',
        color: '#666',
        padding: '40px 20px',
        fontSize: '16px',
    },
};

export default Profile;