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
                navigate("/profile", { replace: true });
            }, 400);
        } catch {
            setStatus({ type: "error", message: "Unable to reach server." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={styles.pageContainer}>
            <div style={styles.loginBox}>
                <div style={styles.header}>
                    <h1 style={styles.logo}>Maps Unbound</h1>
                    <p style={styles.subtitle}>Sign in to your account</p>
                    <br />
                    <img src="d20.svg"width="150" height="150"></img>
                </div>

                {status.message && (
                    <div style={status.type === "success" ? styles.successAlert : styles.errorAlert}>
                        {status.message}
                    </div>
                )}

                <form style={styles.form} onSubmit={handleSubmit} noValidate>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Email</label>
                        <input
                            type="email"
                            name="email"
                            autoComplete="email"
                            value={form.email}
                            onChange={handleChange}
                            style={errors.email ? {...styles.input, ...styles.inputError} : styles.input}
                            placeholder="Enter your email"
                        />
                        {errors.email && <span style={styles.error}>{errors.email}</span>}
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Password</label>
                        <input
                            type="password"
                            name="password"
                            autoComplete="current-password"
                            value={form.password}
                            onChange={handleChange}
                            style={errors.password ? {...styles.input, ...styles.inputError} : styles.input}
                            placeholder="Enter your password"
                        />
                        {errors.password && <span style={styles.error}>{errors.password}</span>}
                    </div>

                    <button type="submit" style={styles.submitButton} disabled={isSubmitting}>
                        {isSubmitting ? "Signing in..." : "Sign In"}
                    </button>

                    <div style={styles.divider}>
                        <span style={styles.dividerText}>OR</span>
                    </div>

                    <p style={styles.signupText}>
                        Don't have an account?{' '}
                        <Link to="/signup" style={styles.signupLink}>Create one here</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}

const styles = {
    pageContainer: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        padding: '20px',
    },
    loginBox: {
        width: '100%',
        maxWidth: '420px',
        background: '#fff',
        borderRadius: '10px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        padding: '40px',
    },
    header: {
        textAlign: 'center',
        marginBottom: '30px',
    },
    logo: {
        color: '#00FFFF',
        fontSize: '32px',
        fontWeight: 'bold',
        margin: '0 0 10px 0',
    },
    subtitle: {
        color: '#666',
        fontSize: '14px',
        margin: 0,
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
    },
    formGroup: {
        marginBottom: '20px',
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#333',
    },
    input: {
        width: '100%',
        padding: '12px',
        fontSize: '14px',
        border: '1px solid #ddd',
        borderRadius: '5px',
        outline: 'none',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box',
    },
    inputError: {
        borderColor: '#dc3545',
    },
    error: {
        display: 'block',
        marginTop: '6px',
        color: '#dc3545',
        fontSize: '12px',
    },
    submitButton: {
        width: '100%',
        padding: '12px',
        fontSize: '16px',
        fontWeight: 'bold',
        backgroundColor: '#00FFFF',
        color: '#111',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    divider: {
        position: 'relative',
        textAlign: 'center',
        margin: '20px 0',
        borderTop: '1px solid #ddd',
    },
    dividerText: {
        position: 'relative',
        top: '-12px',
        background: '#fff',
        padding: '0 10px',
        color: '#999',
        fontSize: '12px',
    },
    signupText: {
        textAlign: 'center',
        fontSize: '14px',
        color: '#666',
    },
    signupLink: {
        color: '#00FFFF',
        textDecoration: 'none',
        fontWeight: 'bold',
    },
    successAlert: {
        padding: '12px',
        marginBottom: '20px',
        background: '#d4edda',
        border: '1px solid #c3e6cb',
        borderRadius: '5px',
        color: '#155724',
        fontSize: '14px',
    },
    errorAlert: {
        padding: '12px',
        marginBottom: '20px',
        background: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '5px',
        color: '#721c24',
        fontSize: '14px',
    },
};

export default Login;