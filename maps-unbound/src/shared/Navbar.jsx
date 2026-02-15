import { Link, useNavigate } from "react-router-dom";
import Button from "../shared/Button.jsx";
import { useAuth } from "../context/AuthContext.jsx";

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
};

export default Navbar;