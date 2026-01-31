function Home() {
    return (
        <div style={styles.container}>
            <h1 style={styles.heading}>Welcome to Maps Unbound</h1>
            <p style={styles.paragraph}>
                Your personal virtual tabletop for TTRPGs.
            </p>
        </div>
    );
}

const styles = {
    container: {
        textAlign: 'center',
        padding: '50px 20px',
    },
    heading: {
        fontSize: '36px',
        marginBottom: '20px',
    },
    paragraph: {
        fontSize: '18px',
        color: '#555',
    },
};

export default Home;