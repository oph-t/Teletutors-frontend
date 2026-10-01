import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, password }),
            });
            const data = await res.json();

            if (res.ok) {
                navigate("/admin/dashboard");
            } else {
                setError(data.error || "Login failed.");
                setLoading(false);
            }
        } catch (err) {
            setError("Could not reach the server.");
            setLoading(false);
            console.error(err);
        }
    }

    return (
        <div className="login-page">
            <style>{`
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                :root {
                    --bg: #F7F6F2; --surface: #FFFFFF; --border: #E2E0D9;
                    --accent: #2A6FDB; --accent-dk: #1F57AF; --text: #1A1A1A;
                    --muted: #6B6B6B; --deny: #C0392B;
                }
                body { background: var(--bg); }
                .login-page {
                    font-family: 'Segoe UI', system-ui, sans-serif;
                    color: var(--text);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .login-card {
                    background: var(--surface); border: 1px solid var(--border);
                    border-radius: 12px; padding: 2.5rem; width: 100%; max-width: 360px;
                }
                .login-card h1 { font-size: 1.3rem; margin-bottom: 0.4rem; }
                .login-card p.sub { font-size: 0.85rem; color: var(--muted); margin-bottom: 1.75rem; }
                label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.4rem; }
                input {
                    width: 100%; padding: 0.65rem 0.8rem; border: 1px solid var(--border);
                    border-radius: 8px; font-size: 0.95rem; margin-bottom: 1.1rem; outline: none;
                }
                input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(42, 111, 219, 0.12); }
                button {
                    width: 100%; padding: 0.75rem; border: none; border-radius: 8px;
                    background: var(--accent); color: #fff; font-size: 0.95rem; font-weight: 600;
                    cursor: pointer; transition: background 0.15s;
                }
                button:hover { background: var(--accent-dk); }
                button:disabled { opacity: 0.6; cursor: not-allowed; }
                .error-banner {
                    background: #FBEAE8; color: var(--deny); padding: 0.6rem 0.8rem;
                    border-radius: 8px; font-size: 0.85rem; margin-bottom: 1.1rem;
                }
            `}</style>

            <div className="login-card">
                <h1>Admin Login</h1>
                <p className="sub">Sign in to manage tutor applications.</p>

                {error && <div className="error-banner">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <label htmlFor="name">Username</label>
                    <input
                        type="text"
                        id="name"
                        autoComplete="username"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button type="submit" disabled={loading}>
                        {loading ? "Logging in..." : "Log In"}
                    </button>
                </form>
            </div>
        </div>
    );
}
