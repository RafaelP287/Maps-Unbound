import Button from "../../shared/Button";
import mapIMG from "./images/home1.jpg";
import characterIMG from "./images/home2.jpg";
import campaignIMG from "./images/home3.jpg";
import partyFinderIMG from "./images/home4.jpg";

function Home() {
    const services = [
        {
            title: "Map Editor",
            description: "Create and customize your own maps with our intuitive map editor.",
            image: mapIMG
        },
        {
            title: "Character Management",
            description: "Create and manage your characters with our comprehensive character sheets and tools.",
            image: characterIMG
        },
        {
            title: "Campaign Management",
            description: "Organize your campaigns, track character progress, and manage sessions with ease.",
            image: campaignIMG
        },
        {
            title: "Party Finder",
            description: "Connect with other players and find groups to join or create your own party.",
            image: partyFinderIMG
        }
    ]

    return (
        <>
            {/* Hero Section */}
            <div style={styles.container}>
                <h1 style={styles.subHeading}>Welcome to</h1>
                <h2 style={styles.heading}>MAPS UNBOUND</h2>
                <p style={styles.paragraph}>
                    Your personal vitrual tabletop RPG destination!
                </p>
                <Button onClick={() => alert('Not implemented yet')}>
                    Get Started
                </Button>
            </div>

            {/* Services Section */}
            <div style={styles.container}>
                <h1 style={styles.subHeading}>We offer a variety of tools and features to enhance your tabletop RPG experience.</h1>
                <div style={styles.serviceCards}>
                    {services.map((service, index) => (
                        <div
                            key={service.title}
                            style={{
                                ...styles.card,
                                backgroundImage: `url(${service.image})`,
                            }}
                        >
                            <div style={styles.cardOverlay}>
                                <h3 style={styles.cardTitle}>{service.title}</h3>
                                <p style={styles.cardDescription}>{service.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

const styles = {
    container: {
        textAlign: 'center',
        padding: '50px 20px',
    },
    heading: {
        fontSize: '60px',
        margin: '10px 0',
    },
    subHeading: {
        fontSize: '32px',
        margin: '10px 0',
    },
    paragraph: {
        fontSize: '18px',
        color: '#ffffff',
    },
    imageContainer: {
        height: '400px',
        backgroundColor: '#333',
        margin: '20px 0',
    },
    serviceCards: {
        display: 'flex',
        flexDirection: 'column', 
        gap: '20px',
        alignItems: 'center',
    },
    card: {
        position: 'relative',
        width: '90%',
        maxWidth: '1200px',
        minHeight: '200px',
        borderRadius: '8px',
        border: '1px solid #444',
        overflow: 'hidden',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '40px',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    },
    cardOverlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '20px',
        borderRadius: '8px',
    },
    cardTitle: {
        fontSize: '24px',
        marginBottom: '10px',
    },
    cardDescription: {
        fontSize: '16px',
        color: '#cccccc',
    }, 
};

export default Home;