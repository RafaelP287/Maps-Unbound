import "./shared.css";

function Button({ children, onClick, type = "button", disabled = false }) {
    return (
        <button
            className="button"
            onClick={onClick}
            type={type}
            disabled={disabled}
        >
            {children}
        </button>
    );
}

export default Button;