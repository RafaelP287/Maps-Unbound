// Session route entrypoint:
// - `/session` renders lobby flow
// - legacy `?view=dm` links are redirected to `/session/dm`
import { Navigate, useSearchParams } from "react-router-dom";
import SessionDMView from "./SessionDMView.jsx";
import SessionLobby from "./SessionLobby.jsx";

function Session() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get("view");

  if (view === "dm") {
    const params = new URLSearchParams(searchParams);
    params.delete("view");
    return <Navigate to={`/session/dm?${params.toString()}`} replace />;
  }

  return <SessionLobby />;
}

export default Session;
