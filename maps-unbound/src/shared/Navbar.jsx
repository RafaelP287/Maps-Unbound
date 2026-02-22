import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Button from "../shared/Button.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const AUTH_STORAGE_KEY = "maps-unbound-auth";

function Navbar() {
    const navigate = useNavigate();
    const { user, logout, isLoggedIn, loading } = useAuth();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    if (loading) return null;

    return (
        <nav style={styles.navbar}>
            <Link to="/" style={styles.titleLink}>
                <h2 style={styles.title}>Maps Unbound</h2>
            </Link>

            <div style={styles.links}>
                {isLoggedIn ? (
                    <>
                        <Link to="/" style={styles.link}>Home</Link>
                        <Link to="/maps" style={styles.link}>Maps</Link>
                        <Link to="/characters" style={styles.link}>Characters</Link>
                        <Link to="/campaigns" style={styles.link}>Campaigns</Link>
                        <Link to="/party-finder" style={styles.link}>Party Finder</Link>

                        <Link to="/profile" style={styles.userLink}>
                            {user.username[0].toUpperCase() + user.username.slice(1)}
                        </Link>

                        <Button onClick={handleLogout} style={{ marginLeft: '20px' }}>
                            Logout
                        </Button>
                    </>
                ) : (
                    <Link to="/login" style={styles.link}>
                        <Button>Sign In</Button>
                    </Link>
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
    userLink: {
        color: '#00FFFF',
        textDecoration: 'none',
        fontSize: '16px',
        fontWeight: 'bold',
    },
    dropdownContainer: {
        position: 'relative',
    },
    dropdownToggle: {
        background: 'none',
        border: 'none',
        color: 'white',
        fontSize: '16px',
        cursor: 'pointer',
        padding: '8px 0',
        transition: 'color 0.2s',
    },
    dropdownMenu: {
        position: 'absolute',
        top: '100%',
        left: 0,
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '4px',
        minWidth: '250px',
        marginTop: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        zIndex: 1001,
    },
    dropdownItem: {
        display: 'block',
        padding: '12px 16px',
        color: 'white',
        textDecoration: 'none',
        borderBottom: '1px solid #333',
        transition: 'background-color 0.2s',
    },
    dropdownCreate: {
        display: 'block',
        padding: '12px 16px',
        color: '#00FFFF',
        textDecoration: 'none',
        fontWeight: 'bold',
        textAlign: 'center',
        backgroundColor: '#111',
        borderRadius: '0 0 4px 4px',
        transition: 'background-color 0.2s',
    },
    smallText: {
        fontSize: '12px',
        color: '#888',
        margin: '4px 0 0 0',
    },
    emptyText: {
        color: '#666',
        margin: 0,
    },
};

export default Navbar;