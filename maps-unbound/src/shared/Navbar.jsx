import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const AUTH_STORAGE_KEY = "maps-unbound-auth";

function getUserFromStorage() {
    try {
        const authData = localStorage.getItem(AUTH_STORAGE_KEY);
        if (authData) {
            const { user } = JSON.parse(authData);
            return user;
        }
    } catch (error) {
        console.error("Failed to parse auth data:", error);
    }
    return null;
}

function Navbar() {
    const navigate = useNavigate();
    const [user, setUser] = useState(() => getUserFromStorage());

    useEffect(() => {
        // Poll localStorage every 300ms to detect login/logout
        const interval = setInterval(() => {
            setUser(getUserFromStorage());
        }, 300);

        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setUser(null);
        navigate('/');
    };

    return (
        <nav style={styles.navbar}>
            <Link to="/" style={styles.titleLink}>
                <h2 style={styles.title}>Maps Unbound</h2>
            </Link>
            <div style={styles.links}>
                <Link to="/" style={styles.link}>Home</Link>
                <Link to="/maps" style={styles.link}>Maps</Link>
                <Link to="/characters" style={styles.link}>Characters</Link>
                <Link to="/campaigns" style={styles.link}>Campaigns</Link>
                <Link to="/party-finder" style={styles.link}>Party Finder</Link>
                
                {user ? (
                    <>
                        <Link to="/profile" style={styles.link}>
                            {user.username.charAt(0).toUpperCase() + user.username.slice(1).toLowerCase()}
                        </Link>
                        <button onClick={handleLogout} style={styles.logoutButton}>
                            Logout
                        </button>
                    </>
                ) : (
                    <Link to="/login" style={styles.link}>Sign In</Link>
                )}
            </div>
        </nav>
    );
}

const styles = {
    navbar: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        backgroundColor: '#111',
    },
    title: {
        color: '#00FFFF',
        margin: 0,
    },
    titleLink: {
        textDecoration: 'none',
    },
    links: {
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
    },
    link: {
        color: 'white',
        textDecoration: 'none',
        fontSize: '16px',
        transition: 'color 0.2s',
    },
    logoutButton: {
        background: '#dc3545',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
    },
};

export default Navbar;