import { useEffect, useState } from "react";
import { apiFetch } from "../lib/apiFetch.js";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";

export default function AdminDashboard() {
    const [tutorCount, setTutorCount] = useState(0);
    const [jobCount, setJobCount] = useState(0);
    const [missingInitialsCount, setMissingInitialsCount] = useState(0);

    useEffect(() => {
        apiFetch("/admin/pending/count")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => data && setTutorCount(data.count))
            .catch((err) => console.error("Failed to load pending count:", err));

        apiFetch("/admin/jobs/count")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => data && setJobCount(data.count))
            .catch((err) => console.error("Failed to load job count:", err));

        apiFetch("/admin/tutors/approved/missing-initials-count")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => data && setMissingInitialsCount(data.count))
            .catch((err) => console.error("Failed to load missing-initials count:", err));
    }, []);

    async function handleLogout() {
        const navigate = useNavigate();
        try {
            await fetch("/admin/logout", { method: "POST" });
        } catch (err) {
            console.error(err);
        }
        navigate("/admin");
    }

    function Badge({ count }) {
        if (!count || count <= 0) return null;
        return <span className="badge visible">{count > 99 ? "99+" : count}</span>;
    }

    return (
        <div className="dashboard-page">
            <Header />
            <style>{`
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                :root {
                    --bg: #F7F6F2; --surface: #FFFFFF; --border: #E2E0D9;
                    --accent: #2A6FDB; --text: #1A1A1A; --muted: #6B6B6B;
                }
                body { background: var(--bg); }
                .dashboard-page {
                    font-family: 'Segoe UI', system-ui, sans-serif;
                    color: var(--text); min-height: 100vh; padding-top: 56px;
                }
                #logoutBtn:hover { background: #F2F2F2; }
                .container { max-width: 720px; margin: 0 auto; padding: 3rem 1.5rem; }
                .container > p.welcome { color: var(--muted); margin-bottom: 2rem; font-size: 0.95rem; }
                .card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
                @media (max-width: 600px) { .card-grid { grid-template-columns: 1fr; } }
                .nav-card {
                    display: block; position: relative; background: var(--surface);
                    border: 1px solid var(--border); border-radius: 12px; padding: 1.75rem;
                    text-decoration: none; color: inherit; transition: box-shadow 0.15s, transform 0.15s;
                }
                .nav-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.06); transform: translateY(-1px); }
                .badge {
                    position: absolute; top: -8px; right: -8px; min-width: 22px; height: 22px;
                    padding: 0 6px; border-radius: 999px; background: #C0392B; color: #fff;
                    font-size: 0.75rem; font-weight: 700; display: flex; align-items: center;
                    justify-content: center; line-height: 1; box-shadow: 0 0 0 2px var(--surface);
                }
                .nav-card .icon { font-size: 1.6rem; margin-bottom: 0.6rem; }
                .nav-card h2 { font-size: 1.05rem; margin-bottom: 0.35rem; }
                .nav-card p { font-size: 0.85rem; color: var(--muted); }
            `}</style>

            <div className="container">
                <p className="welcome">Choose what you'd like to manage.</p>

                <div className="card-grid">
                    <Link className="nav-card" to="/admin/tutors">
                        <Badge count={tutorCount} />
                        <div className="icon">🎓</div>
                        <h2>Tutor Applications</h2>
                        <p>Review, approve, or deny pending tutor sign-ups.</p>
                    </Link>

                    <Link className="nav-card" to="/admin/jobs">
                        <Badge count={jobCount} />
                        <div className="icon">📋</div>
                        <h2>Job Listings</h2>
                        <p>View job postings submitted by parents.</p>
                    </Link>

                    <Link className="nav-card" to="/admin/tutor-list">
                        <Badge count={missingInitialsCount} />
                        <div className="icon">📇</div>
                        <h2>Tutor List</h2>
                        <p>Directory of approved tutors and their details.</p>
                    </Link>
                </div>
            </div>
        </div>
    );
}
