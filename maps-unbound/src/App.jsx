import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import Maps from "./pages/Maps.jsx";
import Campaigns from "./pages/Campaigns.jsx";
import CreateCampaign from "./pages/CreateCampaign.jsx";
import PartyFinder from "./pages/PartyFinder.jsx";
import Signup from "./pages/Signup.jsx";
import Login from "./pages/Login.jsx";

function App() {
  return (
    <BrowserRouter>
      <div style={styles.page}>
        <Navbar />

        <main style={styles.main}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/maps" element={<Maps />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/create-campaign" element={<CreateCampaign />} />
            <Route path="/party-finder" element={<PartyFinder />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
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
    paddingBottom: '60px',
  },
};

export default App;
