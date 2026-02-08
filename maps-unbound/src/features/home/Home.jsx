import Button from "../../shared/Button";
import "./home.css";

function Home() {
    return (
        <>
            {/* Hero Section */}
            <div style={styles.container}>
                <h1 style={styles.heading}>Welcome to Maps Unbound</h1>
                <p style={styles.paragraph}>
                    Your personal vitrual tabletop RPG destination!
                </p>
                <Button onClick={() => alert('Get Started clicked!')}>
                    Get Started
                </Button>
            </div>

            {/* Services Section */}
        </>
    );
}

const styles = {
    container: {
        textAlign: 'center',
        padding: '50px 20px',
    },
    heading: {
        fontSize: '42px',
        marginBottom: '20px',
    },
    paragraph: {
        fontSize: '18px',
        color: '#ffffff',
    },
};

export default Home;