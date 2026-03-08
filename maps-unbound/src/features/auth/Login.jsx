import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [form, setForm] = useState({ email: "", password: "" });
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState({ type: "idle", message: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
        if (status.type !== "idle") setStatus({ type: "idle", message: "" });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextErrors = {};
        if (!form.email.trim()) nextErrors.email = "Email is required.";
        if (!form.password) nextErrors.password = "Password is required.";
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            setStatus({ type: "error", message: "Fix the highlighted fields." });
            return;
        }

        setIsSubmitting(true);
        setStatus({ type: "idle", message: "" });

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: form.email.trim().toLowerCase(),
                    password: form.password,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const message = data.message || "Login failed.";
                const fieldErrors = data.errors || {};
                if (fieldErrors && typeof fieldErrors === "object") {
                    setErrors((prev) => ({ ...prev, ...fieldErrors }));
                }
                setStatus({ type: "error", message });
                return;
            }

            login({ user: data.user, token: data.token });
            setStatus({ type: "success", message: "Welcome back, adventurer." });
            setForm({ email: "", password: "" });
            setTimeout(() => navigate("/profile", { replace: true }), 400);
        } catch (error) {
            console.error("Login error:", error);
            setStatus({ type: "error", message: "Unable to reach the realm." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={pageStyle}>
            <div style={cardStyle}>

                {/* Header */}
                <div style={headerStyle}>
                    <div style={ornamentRowStyle}>
                        <div style={ornamentLineStyle} />
                        <span style={ornamentRuneStyle}>✦</span>
                        <div style={ornamentLineStyle} />
                    </div>
                    <h1 style={titleStyle}>Maps Unbound</h1>
                    <p style={subtitleStyle}>Enter your credentials to continue</p>
                    <div style={ornamentRowStyle}>
                        <div style={ornamentLineStyle} />
                        <span style={ornamentRuneStyle}>✦</span>
                        <div style={ornamentLineStyle} />
                    </div>
                </div>

                {/* Status banner */}
                {status.message && (
                    <div style={status.type === "success" ? successBannerStyle : errorBannerStyle}>
                        <span style={{ marginRight: "0.5rem" }}>
                            {status.type === "success" ? "✦" : "⚠"}
                        </span>
                        {status.message}
                    </div>
                )}

                {/* Form */}
                <form style={formStyle} onSubmit={handleSubmit} noValidate>
                    <div style={fieldGroupStyle}>
                        <label style={labelStyle}>Email</label>
                        <input
                            type="email"
                            name="email"
                            autoComplete="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="your@email.com"
                            style={errors.email ? { ...inputStyle, ...inputErrorStyle } : inputStyle}
                        />
                        {errors.email && <span style={fieldErrorStyle}>{errors.email}</span>}
                    </div>

                    <div style={fieldGroupStyle}>
                        <label style={labelStyle}>Password</label>
                        <input
                            type="password"
                            name="password"
                            autoComplete="current-password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            style={errors.password ? { ...inputStyle, ...inputErrorStyle } : inputStyle}
                        />
                        {errors.password && <span style={fieldErrorStyle}>{errors.password}</span>}
                    </div>

                    <button type="submit" style={submitBtnStyle} disabled={isSubmitting}>
                        {isSubmitting ? "Entering the realm…" : "⚔  Sign In"}
                    </button>

                    <div style={dividerStyle}>
                        <div style={dividerLineStyle} />
                        <span style={dividerTextStyle}>or</span>
                        <div style={dividerLineStyle} />
                    </div>

                    <p style={footerTextStyle}>
                        No account yet?{" "}
                        <Link to="/signup" style={footerLinkStyle}>Begin your journey</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}

/* ── Styles ── */
const pageStyle = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
};

const cardStyle = {
    width: "100%",
    maxWidth: "420px",
    background: "rgba(20, 15, 8, 0.95)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "2.5rem",
    boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
};

const headerStyle = {
    textAlign: "center",
    marginBottom: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
};

const ornamentRowStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
};

const ornamentLineStyle = {
    flex: 1,
    height: "1px",
    background: "linear-gradient(to right, transparent, var(--border))",
};

const ornamentRuneStyle = {
    color: "var(--gold)",
    fontSize: "0.7rem",
    opacity: 0.6,
};

const titleStyle = {
    fontFamily: "'Cinzel Decorative', serif",
    fontSize: "1.7rem",
    color: "var(--gold-light)",
    margin: 0,
    textShadow: "0 0 30px rgba(201,168,76,0.2)",
    letterSpacing: "0.04em",
};

const subtitleStyle = {
    fontFamily: "'Crimson Text', serif",
    fontStyle: "italic",
    color: "var(--text-muted)",
    fontSize: "0.95rem",
    margin: 0,
};

const successBannerStyle = {
    background: "rgba(76, 175, 130, 0.12)",
    border: "1px solid rgba(76, 175, 130, 0.35)",
    borderRadius: "6px",
    color: "#72d4a8",
    padding: "0.7rem 1rem",
    marginBottom: "1.5rem",
    fontSize: "0.9rem",
    fontFamily: "'Crimson Text', serif",
};

const errorBannerStyle = {
    background: "rgba(192, 57, 43, 0.12)",
    border: "1px solid rgba(192, 57, 43, 0.4)",
    borderRadius: "6px",
    color: "#ff9089",
    padding: "0.7rem 1rem",
    marginBottom: "1.5rem",
    fontSize: "0.9rem",
    fontFamily: "'Crimson Text', serif",
};

const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
};

const fieldGroupStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
};

const labelStyle = {
    fontFamily: "'Cinzel', serif",
    fontSize: "0.72rem",
    fontWeight: "600",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--gold)",
};

const inputStyle = {
    padding: "0.65rem 0.9rem",
    borderRadius: "6px",
    border: "1px solid var(--border)",
    background: "rgba(0,0,0,0.45)",
    color: "#e8dcca",
    fontSize: "1rem",
    fontFamily: "'Crimson Text', serif",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
};

const inputErrorStyle = {
    borderColor: "rgba(192,57,43,0.7)",
    boxShadow: "0 0 0 3px rgba(192,57,43,0.1)",
};

const fieldErrorStyle = {
    color: "#ff9089",
    fontSize: "0.82rem",
    fontFamily: "'Crimson Text', serif",
    fontStyle: "italic",
};

const submitBtnStyle = {
    fontFamily: "'Cinzel', serif",
    fontSize: "0.85rem",
    fontWeight: "700",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--bg-deep)",
    background: "linear-gradient(135deg, var(--gold), var(--gold-light))",
    border: "none",
    borderRadius: "6px",
    padding: "0.85rem",
    cursor: "pointer",
    width: "100%",
    boxShadow: "0 4px 20px rgba(201,168,76,0.2)",
    transition: "opacity 0.2s",
    marginTop: "0.25rem",
};

const dividerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
};

const dividerLineStyle = {
    flex: 1,
    height: "1px",
    background: "rgba(201,168,76,0.15)",
};

const dividerTextStyle = {
    fontFamily: "'Cinzel', serif",
    fontSize: "0.65rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--text-faint)",
};

const footerTextStyle = {
    textAlign: "center",
    fontFamily: "'Crimson Text', serif",
    fontStyle: "italic",
    color: "var(--text-muted)",
    fontSize: "0.95rem",
    margin: 0,
};

const footerLinkStyle = {
    color: "var(--gold)",
    textDecoration: "none",
    fontWeight: "600",
};

export default Login;