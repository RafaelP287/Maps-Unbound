import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const AUTH_STORAGE_KEY = "maps-unbound-auth";

function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        email: "",
        password: "",
    });
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState({ type: "idle", message: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
        if (status.type !== "idle") {
            setStatus({ type: "idle", message: "" });
        }
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
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: form.email.trim().toLowerCase(),
                    password: form.password,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const message = data.message || data.error || "Login failed.";
                const fieldErrors = data.errors || {};
                if (fieldErrors && typeof fieldErrors === "object") {
                    setErrors((prev) => ({ ...prev, ...fieldErrors }));
                }
                setStatus({ type: "error", message });
                return;
            }

            if (data.token) {
                localStorage.setItem(
                    AUTH_STORAGE_KEY,
                    JSON.stringify({ token: data.token, user: data.user })
                );
            }

            setStatus({ type: "success", message: "Welcome back!" });
            setForm({ email: "", password: "" });

            setTimeout(() => {
                navigate("/", { replace: true });
            }, 400);
        } catch {
            setStatus({ type: "error", message: "Unable to reach server." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={styles.container}>
            <h1>Login to Maps Unbound</h1>
            <form style={styles.form} onSubmit={handleSubmit} noValidate>
                <label style={styles.label}>
                    Email:
                    <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={handleChange}
                        style={styles.input}
                    />
                    {errors.email && <span style={styles.error}>{errors.email}</span>}
                </label>
                <label style={styles.label}>
                    Password:
                    <input
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        value={form.password}
                        onChange={handleChange}
                        style={styles.input}
                    />
                    {errors.password && <span style={styles.error}>{errors.password}</span>}
                </label>
                <button type="submit" style={styles.button} disabled={isSubmitting}>
                    {isSubmitting ? "Signing in..." : "Login"}
                </button>
                {status.message && (
                    <p
                        style={
                            status.type === "success" ? styles.successMessage : styles.errorMessage
                        }
                    >
                        {status.message}
                    </p>
                )}
            </form>
            <p>
                Don&apos;t have an account? Sign up <Link to="/signup">here</Link>.
            </p>
        </div>
    );
}

const styles = {
    container: {
        textAlign: 'center',
        padding: '50px 20px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '400px',
        margin: '0 auto',
    },
    label: {
        marginBottom: '15px',
        fontSize: '16px',
    },
    input: {
        width: '100%',
        padding: '8px',
        marginTop: '5px',
        fontSize: '14px',
    },
    button: {
        padding: '10px',
        fontSize: '16px',
        backgroundColor: '#282c34',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
    },
    error: {
        display: 'block',
        marginTop: '6px',
        color: '#fca5a5',
        fontSize: '0.9rem',
    },
    successMessage: {
        marginTop: '16px',
        color: '#86efac',
        fontSize: '1rem',
    },
    errorMessage: {
        marginTop: '16px',
        color: '#fca5a5',
        fontSize: '1rem',
    },
};

export default Login;