import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";

const NAV_ITEMS = [
    { to: "/admin/dashboard", label: "Dashboard", icon: "🏠", countKey: null },
    { to: "/admin/tutors", label: "Tutor Applications", icon: "🎓", countKey: "pending" },
    { to: "/admin/jobs", label: "Job Listings", icon: "📋", countKey: "jobs" },
    { to: "/admin/tutor-list", label: "Tutor List", icon: "📇", countKey: "missingInitials" },
];

export default function Header() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [counts, setCounts] = useState({ pending: 0, jobs: 0, missingInitials: 0 });
    const [confirmingLogout, setConfirmingLogout] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [toast, setToast] = useState(null);

    async function loadCounts() {
        try {
            const [pendingRes, jobsRes, missingRes] = await Promise.all([
                apiFetch("/admin/pending/count").then((r) => (r.ok ? r.json() : { count: 0 })),
                apiFetch("/admin/jobs/count").then((r) => (r.ok ? r.json() : { count: 0 })),
                apiFetch("/admin/tutors/approved/missing-initials-count").then((r) => (r.ok ? r.json() : { count: 0 })),
            ]);
            setCounts({ pending: pendingRes.count || 0, jobs: jobsRes.count || 0, missingInitials: missingRes.count || 0 });
        } catch (err) {
            console.error("Failed to load header counts:", err);
        }
    }

    useEffect(() => {
        loadCounts();
    }, []);

    function toggleMenu() {
        setOpen((o) => {
            const next = !o;
            if (next) { loadCounts(); setConfirmingLogout(false); }
            return next;
        });
    }

    function closeMenu() {
        setOpen(false);
        setConfirmingLogout(false);
    }

    async function doLogout() {
        setLoggingOut(true);
        try {
            await fetch("/admin/logout", { method: "POST" });
        } catch (err) {
            console.error(err);
        }
        setToast("Logged out.");
        setTimeout(() => navigate("/admin"), 600);
    }

    return (
        <>
            <header className="app-header">
                <button className="hamburger-btn" onClick={toggleMenu} aria-label="Menu">
                    <span></span><span></span><span></span>
                </button>
                <div className="app-header-title">Happy Tutors Admin</div>
            </header>

            {open && <div className="menu-backdrop" onClick={closeMenu} />}

            {open && (
                <div className="menu-panel">
                    <nav>
                        {NAV_ITEMS.map((item) => {
                            const count = item.countKey ? counts[item.countKey] : 0;
                            return (
                                <button key={item.to} className="menu-item" onClick={() => { closeMenu(); navigate(item.to); }}>
                                    <span className="menu-item-icon">{item.icon}</span>
                                    <span className="menu-item-label">{item.label}</span>
                                    {count > 0 && <span className="menu-badge">{count > 99 ? "99+" : count}</span>}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="menu-divider" />

                    {!confirmingLogout && (
                        <button className="menu-item logout-item" onClick={() => setConfirmingLogout(true)}>
                            <span className="menu-item-icon">🚪</span>
                            <span className="menu-item-label">Log Out</span>
                        </button>
                    )}

                    {confirmingLogout && (
                        <div className="logout-confirm">
                            <p>Log out of the admin panel?</p>
                            <div className="logout-confirm-actions">
                                <button className="logout-confirm-yes" disabled={loggingOut} onClick={doLogout}>
                                    {loggingOut ? "Logging out..." : "Yes, log out"}
                                </button>
                                <button className="logout-confirm-no" onClick={() => setConfirmingLogout(false)}>Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {toast && <div className="toast">{toast}</div>}

            <style>{`
                .app-header {
                    position: fixed; top: 0; left: 0; right: 0; height: 56px; z-index: 100;
                    background: #FFFFFF; border-bottom: 1px solid #E2E0D9;
                    display: flex; align-items: center; padding: 0 1.25rem; gap: 0.9rem;
                    font-family: 'Segoe UI', system-ui, sans-serif;
                }
                .hamburger-btn { background: none; border: none; cursor: pointer; padding: 0.4rem; display: flex; flex-direction: column; gap: 4px; justify-content: center; }
                .hamburger-btn span { display: block; width: 22px; height: 2px; background: #1A1A1A; border-radius: 2px; }
                .app-header-title { font-size: 0.95rem; font-weight: 700; color: #1A1A1A; }
                .menu-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.25); z-index: 99; }
                .menu-panel {
                    position: fixed; top: 56px; left: 0; width: 280px; max-width: 85vw;
                    background: #FFFFFF; border-right: 1px solid #E2E0D9; border-bottom: 1px solid #E2E0D9;
                    z-index: 100; box-shadow: 2px 4px 14px rgba(0,0,0,0.08);
                    font-family: 'Segoe UI', system-ui, sans-serif; padding: 0.6rem;
                }
                .menu-item { display: flex; align-items: center; gap: 0.7rem; width: 100%; text-align: left; background: none; border: none; padding: 0.7rem 0.6rem; border-radius: 8px; font-size: 0.9rem; font-weight: 500; color: #1A1A1A; cursor: pointer; }
                .menu-item:hover { background: #F2F4F8; }
                .menu-item-icon { font-size: 1.05rem; }
                .menu-item-label { flex: 1; }
                .menu-badge { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: #C0392B; color: #fff; font-size: 0.7rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
                .menu-divider { height: 1px; background: #E2E0D9; margin: 0.4rem 0; }
                .logout-item { color: #C0392B; }
                .logout-confirm { padding: 0.7rem 0.6rem; font-size: 0.85rem; }
                .logout-confirm p { margin-bottom: 0.6rem; color: #1A1A1A; }
                .logout-confirm-actions { display: flex; gap: 0.5rem; }
                .logout-confirm-actions button { flex: 1; padding: 0.45rem; border: none; border-radius: 6px; font-size: 0.82rem; font-weight: 600; cursor: pointer; }
                .logout-confirm-yes { background: #C0392B; color: #fff; }
                .logout-confirm-no { background: none; border: 1px solid #E2E0D9 !important; color: #6B6B6B; }
                .toast {
                    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
                    background: #1A1A1A; color: #fff; padding: 0.65rem 1.1rem; border-radius: 8px;
                    font-size: 0.85rem; z-index: 200; font-family: 'Segoe UI', system-ui, sans-serif;
                    box-shadow: 0 4px 14px rgba(0,0,0,0.2);
                }
            `}</style>
        </>
    );
}