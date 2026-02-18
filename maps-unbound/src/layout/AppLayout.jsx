import { Outlet } from "react-router-dom";
import Navbar from "../shared/Navbar.jsx";
import Footer from "../shared/Footer.jsx";

function AppLayout() {
    return (
        <div style={styles.page}>
            <Navbar />
            <main style={styles.main}>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}

const styles = {
    page: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
    },
    main: {
        flex: 1,
        paddingTop: '60px',
        paddingBottom: '60px',
    },
};

export default AppLayout;