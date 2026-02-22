import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AUTH_STORAGE_KEY = "maps-unbound-auth";

function Profile() {
    const navigate = useNavigate();

    useEffect(() => {
        const authData = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!authData) {
            navigate('/login');
        } else {
            navigate('/');
        }
    }, [navigate]);

    return null;
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
    profileSection: {
        marginBottom: '40px',
    },
    infoCard: {
        background: '#1a1a1a',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #333',
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        paddingBottom: '12px',
        marginBottom: '12px',
        borderBottom: '1px solid #333',
    },
    label: {
        fontWeight: 'bold',
        color: '#00FFFF',
    },
    helpText: {
        color: '#666',
        fontSize: '14px',
    },
};

export default Profile;
