import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { useState, useRef, useCallback } from "react";
import { ThreeDDice } from "dddice-js";
import AppLayout from "./layout/AppLayout.jsx";
import AuthLayout from "./layout/AuthLayout.jsx";

import Home from "./features/home/Home.jsx";

import Maps from "./features/maps/Maps.jsx";

import Campaigns from "./features/campaigns/Campaigns.jsx";
import CreateCampaign from "./features/campaigns/CreateCampaign.jsx";
import ViewCampaign from "./features/campaigns/ViewCampaign.jsx";

import Characters from "./features/characters/Characters.jsx";
import CreateCharacter from "./features/characters/CreateCharacter.jsx";

import PartyFinder from "./features/partyfinder/PartyFinder.jsx";
import Profile from "./features/profile/Profile.jsx";

import Signup from "./features/auth/Signup.jsx";
import Login from "./features/auth/Login.jsx";

function App() {
  const dddiceRef = useRef(null);
  const [isDiceReady, setIsDiceReady] = useState(false);
  const [roomSlug, setRoomSlug] = useState(null);
  const apiKeyRef = useRef(null);

  const initializeDice = useCallback(async (canvasElement) => {
    const apiKey = prompt('Enter your dddice API key:');
    
    if (apiKey && canvasElement) {
      apiKeyRef.current = apiKey;
      dddiceRef.current = new ThreeDDice(canvasElement, apiKey);
      dddiceRef.current.start();
      
      try {
        const response = await fetch('https://dddice.com/api/1.0/room', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Maps Unbound Session',
            is_public: true
          })
        });
        
        const data = await response.json();
        const slug = data.data.slug;
        
        await dddiceRef.current.connect(slug);
        
        setRoomSlug(slug);
        setIsDiceReady(true);
        console.log('Connected to room:', slug);
      } catch (error) {
        console.error('Failed to setup:', error);
        alert('Failed to setup: ' + error.message);
      }
    }
  }, []);

  const rollDice = useCallback((diceType = 'd20') => {
    if (!dddiceRef.current || !roomSlug) {
      return alert('dddice is not initialized');
    }
    
    dddiceRef.current.roll([{ type: diceType, theme: 'dddice-bees' }]);
    console.log('Roll initiated:', diceType);
  }, [roomSlug]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          {/* Home route */}
          <Route index element={<Home />} />
          
          {/* Map routes */}
          <Route 
            path="maps" 
            element={
              <Maps 
                initializeDice={initializeDice}
                rollDice={rollDice}
                isDiceReady={isDiceReady}
              />
            } 
          />
          
          {/* Character Routes */}
          <Route path="characters" element={<Characters />} />
          <Route path="create-character" element={<CreateCharacter />} />


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

export default App;
