import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import Gate from "../../shared/Gate.jsx";

function PartyFinder() {
    const { user, token, isLoggedIn, loading: authLoading } = useAuth();

    if(!isLoggedIn) {
        return (
            <Gate>
                Sign in to find adventuring parties.
            </Gate>
        );
    }

    return (
        <div>
            <h1>Party Finder Page</h1>
        </div>
    );
}

export default PartyFinder;