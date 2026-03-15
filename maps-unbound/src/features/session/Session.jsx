import { Link } from "react-router-dom";

function Session() {
    return (
        <div>
            <h1>Session Page</h1>
            <p>This will probably be a lobby waiting page.</p>
            <p>Button to test for DM View.</p>
            <Link to="/session/dm">
                <button>DM View</button>
            </Link>
        </div>
    )
}

export default Session;