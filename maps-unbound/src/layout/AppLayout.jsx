import { Outlet } from "react-router-dom";
import { useLocation } from 'react-router-dom';
import Navbar from "../shared/Navbar.jsx";
import Footer from "../shared/Footer.jsx";

function AppLayout() {
    const location = useLocation();
    const isMapsCreator = location.pathname === '/maps/create';

    return (
        <div style={styles.page}>
            <Navbar />
            <main style={isMapsCreator ? styles.mainMaps : styles.main}>
                <Outlet />
            </main>
            {!isMapsCreator && <Footer />}
        </div>
    );
}

const styles = {
    page: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#0d0b08',
    },
    main: {
        flex: 1,
        paddingTop: '60px',
        paddingBottom: '60px',
    },
    mainMaps: {
        flex: 1,
        paddingTop: '0px',
        paddingBottom: '0px',
        height: '100vh',
        overflow: 'hidden',
    },
};

export default AppLayout;
