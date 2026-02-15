import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layout/AppLayout.jsx";

import Home from "./features/home/Home.jsx";
import Maps from "./features/maps/Maps.jsx";
import Campaigns from "./features/campaigns/Campaigns.jsx";
import CreateCampaign from "./features/campaigns/CreateCampaign.jsx";
import Characters from "./features/characters/Characters.jsx";
import CreateCharacter from "./features/characters/CreateCharacter.jsx";
import PartyFinder from "./features/partyfinder/PartyFinder.jsx";

import Signup from "./features/auth/Signup.jsx";
import Login from "./features/auth/Login.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="maps" element={<Maps />} />
          <Route path="characters" element={<Characters />} />
          <Route path="create-character" element={<CreateCharacter />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="create-campaign" element={<CreateCampaign />} />
          <Route path="party-finder" element={<PartyFinder />} />
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
