import { Link } from "react-router-dom";
import Button from "./Button";

function Navbar() {
    return (
        <nav style={styles.navbar}>
            <h2 style={styles.title}>Maps Unbound</h2>
            <div style={styles.links}>
                <Link to="/" style={styles.link}>Home</Link>
                <Link to="/maps" style={styles.link}>Maps</Link>
                <Link to="/characters" style={styles.link}>Characters</Link>
                <Link to="/campaigns" style={styles.link}>Campaigns</Link>
                <Link to="/party-finder" style={styles.link}>Party Finder</Link>
                <Link to="/signup" style={{textDecoration: 'none'}}>
                    <Button>Sign Up</Button>
                </Link>
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
        padding: '6px 20px',
        backgroundColor: '#111',
    },
    title: {
        color: '#00FFFF',
        margin: 0,
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
    },
};

export default Navbar;