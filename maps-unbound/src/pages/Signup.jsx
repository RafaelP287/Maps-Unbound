function Signup() {
    return (
        <div style={styles.container}>
            <h1>Sign Up for Maps Unbound</h1>
            <form style={styles.form}>
                <label style={styles.label}>
                    Username:
                    <input type="text" name="username" style={styles.input} />
                </label>
                <label style={styles.label}>
                    Email:
                    <input type="email" name="email" style={styles.input} />
                </label>
                <label style={styles.label}>
                    Password:
                    <input type="password" name="password" style={styles.input} />
                </label>
                <label style={styles.label}>
                    Confirm Password:
                    <input type="password" name="confirmPassword" style={styles.input} />
                </label>
                <button type="submit" style={styles.button}>Sign Up</button>
            </form>
            <p>Already have an account? Log in <a href="/login">here</a>.</p>
        </div>
    );
}

const styles = {
    container: {
        textAlign: 'center',
        padding: '50px 20px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '400px',
        margin: '0 auto',
    },
    label: {
        marginBottom: '15px',
        fontSize: '16px',
    },
    input: {
        width: '100%',
        padding: '8px',
        marginTop: '5px',
        fontSize: '14px',
    },
    button: {
        padding: '10px',
        fontSize: '16px',
        backgroundColor: '#282c34',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
    },
};

export default Signup;