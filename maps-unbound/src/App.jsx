import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layout/AppLayout.jsx";

import Home from "./features/home/Home.jsx";

import Maps from "./features/maps/Maps.jsx";

import Campaigns from "./features/campaigns/Campaigns.jsx";
import CreateCampaign from "./features/campaigns/CreateCampaign.jsx";
import ViewCampaign from "./features/campaigns/ViewCampaign.jsx";

import PartyFinder from "./features/partyfinder/PartyFinder.jsx";

import Signup from "./features/auth/Signup.jsx";
import Login from "./features/auth/Login.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          {/* Home route */}
          <Route index element={<Home />} />

          {/* Map routes */}
          <Route path="maps" element={<Maps />} />

          {/* Campaign routes */}
          <Route path="campaigns">
            <Route index element={<Campaigns />} />
            <Route path="new" element={<CreateCampaign />} />
            <Route path=":id" element={<ViewCampaign />} />
          </Route>

          {/* Party Finder route */}
          <Route path="party-finder" element={<PartyFinder />} />

          {/* Auth routes */}
          <Route path="signup" element={<Signup />} />
          <Route path="login" element={<Login />} />
        </Route>
      </Routes>
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
