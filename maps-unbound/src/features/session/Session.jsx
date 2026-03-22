import { useSearchParams } from "react-router-dom";
import SessionDMView from "./SessionDMView.jsx";
import SessionLobby from "./SessionLobby.jsx";

function Session() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get("view");

  if (view === "dm") {
    return <SessionDMView />;
  }

  return <SessionLobby />;
}

export default Session;
