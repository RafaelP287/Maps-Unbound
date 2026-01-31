import { Link } from "react-router-dom";

function Navbar() {
    return (
        <nav style={styles.navbar}>
            <h2 style={styles.title}>Maps Unbound</h2>
            <div style={styles.links}>
                <Link to="/" style={styles.link}>Home</Link>
                <Link to="/maps" style={styles.link}>Maps</Link>
                <Link to="/campaigns" style={styles.link}>Campaigns</Link>
                <Link to="/party-finder" style={styles.link}>Party Finder</Link>
                <Link to="/signup" style={styles.link}>Sign Up</Link>
            </div>
        </nav>
    );
}

const styles = {
    navbar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        backgroundColor: '#282c34',
    },
    title: {
        color: 'white',
        margin: 0,
    },
    links: {
        display: 'flex',
        gap: '20px',
    },
    link: {
        color: 'white',
        textDecoration: 'none',
        fontSize: '16px',
    },
};

export default Navbar;