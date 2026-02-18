function Footer() {
    return (
        <footer style={styles.footer}>
            <p style={styles.text}>© 2026 Maps Unbound. All rights reserved.</p>
        </footer>
    );
}

const styles = {
    footer: {
        textAlign: 'center',
        padding: '15px 0',
        backgroundColor: '#111',
        position: 'fixed',
        width: '100%',
        bottom: 0,
    },
    text: {
        color: 'white',
        margin: 0,
    },
};

export default Footer;