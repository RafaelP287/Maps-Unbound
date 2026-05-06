import { Outlet } from "react-router-dom";

function SessionLayout() {
    return (
        <div style={styles.page}>
            <main style={styles.main}>
                <Outlet />
            </main>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#0d0b08',
    },
    main: {
        minHeight: '100vh',
    },
};

export default SessionLayout;
