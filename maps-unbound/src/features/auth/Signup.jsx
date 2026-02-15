import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function validateForm({ username, email, password, confirmPassword }) {
  const issues = {};

  if (!username.trim()) issues.username = "Username is required.";
  if (!email.trim()) issues.email = "Email is required.";
  if (!password) issues.password = "Password is required.";
  if (!confirmPassword) issues.confirmPassword = "Confirm your password.";

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.email = "Enter a valid email.";
  }

  if (password && password.length < 8) {
    issues.password = "Password must be at least 8 characters.";
  }

  if (password && confirmPassword && password !== confirmPassword) {
    issues.confirmPassword = "Passwords do not match.";
  }

  return issues;
}

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (status.type !== "idle") setStatus({ type: "idle", message: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatus({ type: "error", message: "Fix the highlighted fields." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = data.message || "Signup failed.";
        const fieldErrors = data.errors || {};
        if (fieldErrors && typeof fieldErrors === "object") {
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
        }
        setStatus({ type: "error", message });
        return;
      }

      // Success
      setStatus({ type: "success", message: "Account created! Redirecting to login..." });
      setForm({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 800);
    } catch (error) {
      console.error("Signup error:", error);
      setStatus({ type: "error", message: "Unable to reach server." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1>Sign Up for Maps Unbound</h1>
      <form style={styles.form} onSubmit={handleSubmit} noValidate>
        <label style={styles.label}>
          Username:
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={form.username}
            onChange={handleChange}
            style={errors.username ? { ...styles.input, ...styles.inputError } : styles.input}
          />
          {errors.username && <span style={styles.error}>{errors.username}</span>}
        </label>

        <label style={styles.label}>
          Email:
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            style={errors.email ? { ...styles.input, ...styles.inputError } : styles.input}
          />
          {errors.email && <span style={styles.error}>{errors.email}</span>}
        </label>

        <label style={styles.label}>
          Password:
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            style={errors.password ? { ...styles.input, ...styles.inputError } : styles.input}
          />
          {errors.password && <span style={styles.error}>{errors.password}</span>}
        </label>

        <label style={styles.label}>
          Confirm Password:
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            style={errors.confirmPassword ? { ...styles.input, ...styles.inputError } : styles.input}
          />
          {errors.confirmPassword && <span style={styles.error}>{errors.confirmPassword}</span>}
        </label>

        <button type="submit" style={styles.button} disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Sign Up"}
        </button>

        {status.message && (
          <p style={status.type === "success" ? styles.successMessage : styles.errorMessage}>
            {status.message}
          </p>
        )}
      </form>

      <p>
        Already have an account? <Link to="/login">Log in here</Link>.
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

export default Signup;