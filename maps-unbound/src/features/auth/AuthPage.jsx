import { Outlet } from "react-router-dom";

function AuthPage() {
    return (
        <div style={styles.container}>
            <h1>Welcome to Maps Unbound</h1>
            <p>Please log in or sign up to continue.</p>
            <Outlet />
        </div>
    );
}

const styles = {
    container: {
        padding: '20px',
        textAlign: 'center',
    },
};

export default AuthPage;