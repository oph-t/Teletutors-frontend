import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../lib/apiFetch.js";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";

function formatDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-SG", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "Asia/Singapore",
    });
}

export default function AdminTutorList() {
    const [tutors, setTutors] = useState(null);
    const [loadListError, setLoadListError] = useState(false);

    const [selectedId, setSelectedId] = useState(null);
    const [selectedTutor, setSelectedTutor] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState(false);

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({ fullName: "", initials: "", phone: "" });
    const [saving, setSaving] = useState(false);
    const [banner, setBanner] = useState(null);

    const [blacklistOpen, setBlacklistOpen] = useState(false);
    const [blacklistReason, setBlacklistReason] = useState("");
    const [blacklistSaving, setBlacklistSaving] = useState(false);

    const [search, setSearch] = useState("");
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [blacklistFilter, setBlacklistFilter] = useState("all"); // all | only | hide
    const [missingInitialsOnly, setMissingInitialsOnly] = useState(false);
    const [missingFirst, setMissingFirst] = useState(true);
    const [subjectFilter, setSubjectFilter] = useState([]);
    const [levelFilter, setLevelFilter] = useState([]);
    const [qualFilter, setQualFilter] = useState([]);
    
    const [tutorJobs, setTutorJobs] = useState([]);
    const [jobsLoading, setJobsLoading] = useState(false);
    const detailCardRef = useRef(null);
    const [jobsMaxHeight, setJobsMaxHeight] = useState(null);
    
    async function loadList() {
        try {
            const res = await apiFetch("/admin/tutors/approved/list");
            if (!res.ok) throw new Error("Failed to load list");
            const data = await res.json();
            setTutors(data);
            setLoadListError(false);
        } catch (err) {
            setLoadListError(true);
            console.error(err);
        }
    }

    useEffect(() => {
        loadList();
        if (!selectedTutor || editing || !detailCardRef.current) {
                setJobsMaxHeight(null);
                return;
            }

            function updateHeight() {
                const stacked = window.innerWidth < 900;
                setJobsMaxHeight(stacked || !detailCardRef.current ? null : detailCardRef.current.offsetHeight);
            }

            updateHeight();

            const observer = new ResizeObserver(updateHeight);
            observer.observe(detailCardRef.current);
            window.addEventListener("resize", updateHeight);

            return () => {
                observer.disconnect();
                window.removeEventListener("resize", updateHeight);
            };
        }, [selectedTutor, editing]);

    async function selectTutor(id) {
        setSelectedId(id);
        setSelectedTutor(null);
        setEditing(false);
        setBanner(null);
        setDetailLoading(true);
        setDetailError(false);
        setBlacklistOpen(false);
        setBlacklistReason("");

        try {
            const res = await apiFetch(`/admin/tutors/approved/${id}`);
            if (!res.ok) throw new Error("Failed to fetch tutor");
            const t = await res.json();
            setSelectedTutor(t);
            setDraft({ fullName: t.fullName, initials: t.initials || "", phone: t.phone });
        } catch (err) {
            setDetailError(true);
            console.error(err);
        } finally {
            setDetailLoading(false);
        }

        setJobsLoading(true);
        try {
            const jobsRes = await apiFetch(`/admin/tutors/approved/${id}/jobs`);
            const jobsData = jobsRes.ok ? await jobsRes.json() : [];
            setTutorJobs(jobsData);
        } catch (err) {
            setTutorJobs([]);
            console.error(err);
        } finally {
            setJobsLoading(false);
        }
    }

    function startEditing() {
        setDraft({ fullName: selectedTutor.fullName, initials: selectedTutor.initials || "", phone: selectedTutor.phone });
        setEditing(true);
        setBanner(null);
    }

    async function saveEdits() {
        setSaving(true);
        setBanner(null);
        try {
            const res = await apiFetch(`/admin/tutors/approved/${selectedId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(draft),
            });
            const data = await res.json();

            if (res.ok) {
                setSelectedTutor(data.tutor);
                setEditing(false);
                setBanner({ type: "success", text: "Saved." });
                await loadList();
            } else {
                setBanner({ type: "error", text: data.error || "Failed to save." });
            }
        } catch (err) {
            setBanner({ type: "error", text: "Could not reach the server." });
            console.error(err);
        } finally {
            setSaving(false);
        }
    }

    async function changeBlacklist(url, body, successText) {
        setBlacklistSaving(true);
        setBanner(null);
        try {
            const res = await apiFetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok) {
                setSelectedTutor(data.tutor);
                setBlacklistOpen(false);
                setBlacklistReason("");
                setBanner({ type: "success", text: successText });
                await loadList();
            } else {
               setBanner({ type: "error", text: data.error || "Something went wrong." });
            }
        } catch (err) {
            setBanner({ type: "error", text: "Could not reach the server." });
            console.error(err);
        } finally {
            setBlacklistSaving(false);
        }
    }

    function submitBlacklist() {
        if (!blacklistReason.trim()) {
            setBanner({ type: "error", text: "Please enter a reason for the blacklist." });
            return;
        }
        changeBlacklist(`/admin/tutors/approved/${selectedId}/blacklist`, { reason: blacklistReason }, "Tutor blacklisted.");
    }

    function removeBlacklist() {
        if (!window.confirm(`Remove ${selectedTutor.fullName} from the blacklist?`)) return;
        changeBlacklist(`/admin/tutors/approved/${selectedId}/unblacklist`, {}, "Removed from blacklist.");
    }

    function toggleIn(setFn, value) {
        setFn((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
    }

    function clearFilters() {
        setSearch("");
        setBlacklistFilter("all");
        setMissingInitialsOnly(false);
        setSubjectFilter([]);
        setLevelFilter([]);
        setQualFilter([]);
    }

    // Options come from the tutors actually loaded, so they always match your data.
    const options = useMemo(() => {
        const uniq = (key) =>
            [...new Set((tutors || []).flatMap((t) => [].concat(t[key] || [])))].sort();
        return { subjects: uniq("subjects"), levels: uniq("levels"), quals: uniq("qualifications") };
    }, [tutors]);

    const visibleTutors = useMemo(() => {
        if (!tutors) return null;
        const q = search.trim().toLowerCase();
        // Within one category: match ANY selected value. Across categories: must match ALL.
        const hasAny = (have, want) => want.length === 0 || want.some((w) => have.includes(w));

        const list = tutors.filter((t) => {
            if (q && !t.fullName.toLowerCase().includes(q)) return false;
            if (blacklistFilter === "only" && !t.blacklisted) return false;
            if (blacklistFilter === "hide" && t.blacklisted) return false;
            if (missingInitialsOnly && t.initials) return false;
            return (
                hasAny([].concat(t.subjects || []), subjectFilter) &&
                hasAny([].concat(t.levels || []), levelFilter) &&
                hasAny([].concat(t.qualifications || []), qualFilter)
            );
        });

        if (missingFirst) {
            list.sort((a, b) => (!!a.initials - !!b.initials) || a.fullName.localeCompare(b.fullName));
        }
        return list;
    }, [tutors, search, blacklistFilter, missingInitialsOnly, missingFirst, subjectFilter, levelFilter, qualFilter]);

    const activeFilterCount =
        (blacklistFilter !== "all" ? 1 : 0) + (missingInitialsOnly ? 1 : 0) +
        subjectFilter.length + levelFilter.length + qualFilter.length;
    const missingCount = (tutors || []).filter((t) => !t.initials).length;
    
    return (
        <div className="tutor-list-page">
            <Header />
            <style>{`
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                :root {
                    --bg: #F7F6F2; --surface: #FFFFFF; --border: #E2E0D9; --accent: #2A6FDB;
                    --accent-dk: #1F57AF; --text: #1A1A1A; --muted: #6B6B6B;
                    --approve: #1E7E4A; --approve-dk: #166238; --deny: #C0392B;
                }
                body { background: var(--bg); }
                .tutor-list-page { font-family: 'Segoe UI', system-ui, sans-serif; color: var(--text); min-height: 100vh; padding-top: 56px; }
                .layout { display: grid; grid-template-columns: minmax(200px, 20%) 1fr; min-height: 100vh; }
                @media (max-width: 800px) {
                    .layout { grid-template-columns: 1fr; }
                    .sidebar { position: static; height: auto; }
                }
                .sidebar { background: var(--surface); border-right: 1px solid var(--border); overflow-y: auto; position: sticky; top: 56px; height: calc(100vh - 56px); align-self: start; }
                .sidebar-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); display: flex; justify-content: space-between; align-items: flex-start; }
                .sidebar-header a.back-link { font-size: 0.75rem; color: var(--muted); text-decoration: none; }
                .sidebar-header h1 { font-size: 1.1rem; font-weight: 600; margin-top: 0.3rem; }
                .logout-btn { background: none; border: 1px solid var(--border); border-radius: 6px; padding: 0.3rem 0.6rem; font-size: 0.75rem; cursor: pointer; color: var(--muted); }
                .tutor-item { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; }
                .tutor-item:hover { background: #F2F4F8; }
                .tutor-item.active { background: #EEF3FC; border-left: 3px solid var(--accent); }
                .tutor-item .name { font-weight: 600; font-size: 0.95rem; }
                .tutor-item .meta { font-size: 0.8rem; color: var(--muted); margin-top: 0.2rem; }
                .missing-tag { display: inline-block; font-size: 0.68rem; font-weight: 700; background: #FBEAE8; color: var(--deny); padding: 0.1rem 0.5rem; border-radius: 999px; margin-top: 0.3rem; }
                .empty-state { padding: 3rem 1.5rem; text-align: center; color: var(--muted); font-size: 0.9rem; }
                .main { padding: 2rem; overflow-y: auto; }
                .placeholder { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--muted); font-size: 0.95rem; }
                .detail-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 2rem; max-width: min(640px, 90%); }
                .detail-card h2 { font-size: 1.4rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.6rem; }
                .field-row { display: grid; grid-template-columns: minmax(110px, 30%) 1fr; gap: 0.5rem; padding: 0.6rem 0; border-bottom: 1px solid var(--border); font-size: 0.9rem; align-items: center; }
                .field-row:last-of-type { border-bottom: none; }
                .field-row .label { color: var(--muted); font-weight: 500; }
                .field-row .value { word-break: break-word; }
                .missing-flag { color: var(--deny); font-weight: 600; }
                .pill-list { display: flex; flex-wrap: wrap; gap: 0.35rem; }
                .pill { background: #EEF3FC; color: var(--accent); padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.8rem; font-weight: 500; }
                .edit-btn { background: var(--accent); color: #fff; border: none; border-radius: 8px; padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; margin-top: 1.5rem; }
                .edit-btn:hover { background: var(--accent-dk); }
                .edit-form input { width: 100%; padding: 0.55rem 0.7rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem; outline: none; }
                .edit-form input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(42, 111, 219, 0.12); }
                .edit-actions { display: flex; gap: 0.6rem; margin-top: 1.25rem; }
                .edit-actions button { padding: 0.6rem 1.2rem; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
                .save-btn { background: var(--approve); color: #fff; }
                .save-btn:hover { background: var(--approve-dk); }
                .cancel-btn { background: none; border: 1px solid var(--border) !important; color: var(--muted); }
                .status-banner { margin-top: 1rem; padding: 0.7rem 0.9rem; border-radius: 8px; font-size: 0.85rem; }
                .status-banner.success { background: #EAF7EF; color: var(--approve); }
                .status-banner.error { background: #FBEAE8; color: var(--deny); }
                .blacklist-tag { display: inline-block; font-size: 0.68rem; font-weight: 700; background: var(--deny); color: #fff; padding: 0.1rem 0.5rem; border-radius: 999px; margin-top: 0.3rem; margin-left: 0.3rem; }
                .blacklist-box { background: #FBEAE8; color: var(--deny); padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.88rem; margin-bottom: 1rem; }
                .blacklist-reason { margin-top: 0.3rem; color: var(--text); }
                .blacklist-btn, .unblacklist-btn { background: none; border: 1px solid var(--deny); color: var(--deny); border-radius: 8px; padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; margin-top: 0.75rem; display: block; }
                .blacklist-btn:hover { background: #FBEAE8; }
                .unblacklist-btn { border-color: var(--border); color: var(--muted); }
                .blacklist-form { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); }
                .blacklist-form label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.4rem; }
                .blacklist-form textarea { width: 100%; min-height: 80px; padding: 0.6rem 0.8rem; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 0.9rem; resize: vertical; outline: none; }
                .blacklist-confirm-btn { background: var(--deny); color: #fff; }
                .filter-bar { padding: 0.9rem 1.5rem; border-bottom: 1px solid var(--border); background: #FAFAF8; }
                .search-input { width: 100%; padding: 0.55rem 0.7rem; border: 1px solid var(--border); border-radius: 8px; font-size: 0.88rem; outline: none; background: #fff; }
                .search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(42, 111, 219, 0.12); }
                .filter-toolbar { display: flex; gap: 0.5rem; margin-top: 0.6rem; flex-wrap: wrap; }
                .filter-toggle { background: #fff; border: 1px solid var(--border); border-radius: 6px; padding: 0.3rem 0.65rem; font-size: 0.78rem; font-weight: 600; cursor: pointer; color: var(--text); }
                .chip { background: #fff; border: 1px solid var(--border); border-radius: 999px; padding: 0.2rem 0.65rem; font-size: 0.75rem; cursor: pointer; color: var(--muted); }
                .chip:hover { border-color: var(--accent); color: var(--accent); }
                .chip.on { background: var(--accent); border-color: var(--accent); color: #fff; }
                .filter-panel { margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px solid var(--border); }
                .filter-group { margin-bottom: 0.8rem; }
                .filter-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 0.35rem; }
                .filter-group select { width: 100%; padding: 0.4rem 0.5rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.82rem; background: #fff; }
                .chip-wrap { display: flex; flex-wrap: wrap; gap: 0.3rem; }
                .check-line { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; margin-bottom: 0.8rem; cursor: pointer; }
                .clear-btn { background: none; border: none; color: var(--accent); font-size: 0.78rem; font-weight: 600; cursor: pointer; padding: 0; }
                .result-count { font-size: 0.75rem; color: var(--muted); margin-top: 0.6rem; }
                .detail-layout { display: flex; align-items: flex-start; gap: 1.5rem; flex-wrap: wrap; }
                .jobs-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; flex: 1 1 300px; max-width: min(380px, 100%); overflow-y: auto; }
                .jobs-section h3 { font-size: 1rem; margin-bottom: 0.9rem; }
                .jobs-loading, .jobs-empty { color: var(--muted); font-size: 0.85rem; }
                .job-row { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem 0.9rem; margin-bottom: 0.6rem; }
                .job-row:last-child { margin-bottom: 0; }
                .job-row-title { font-weight: 700; font-size: 0.88rem; margin-bottom: 0.3rem; }
                .job-row-line { font-size: 0.8rem; color: var(--muted); margin-top: 0.1rem; }

                @media (max-width: 900px) {
                    .detail-layout { flex-direction: column; }
                    .jobs-panel { max-height: none !important; overflow-y: visible; width: 100%; max-width: 100%; }
                }
            `}</style>

            <div className="layout">
                <div className="sidebar">
                    <div className="sidebar-header">
                        <div>
                            <Link className="back-link" to="/admin/dashboard">← Dashboard</Link>
                            <h1>Tutor List</h1>
                        </div>
                    </div>
                    <div className="filter-bar">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search by name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <div className="filter-toolbar">
                            <button className="filter-toggle" onClick={() => setFiltersOpen((o) => !o)}>
                                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""} {filtersOpen ? "▲" : "▼"}
                            </button>
                            <button
                                className={`chip ${missingInitialsOnly ? "on" : ""}`}
                                onClick={() => setMissingInitialsOnly((v) => !v)}
                            >
                                ⚠ Missing initials{tutors ? ` (${missingCount})` : ""}
                            </button>
                        </div>

                        {filtersOpen && (
                            <div className="filter-panel">
                                <div className="filter-group">
                                    <div className="filter-title">Blacklist</div>
                                    <select value={blacklistFilter} onChange={(e) => setBlacklistFilter(e.target.value)}>
                                        <option value="all">All</option>
                                        <option value="only">Only blacklisted</option>
                                        <option value="hide">Hide blacklisted</option>
                                    </select>
                                </div>

                                <label className="check-line">
                                    <input type="checkbox" checked={missingFirst} onChange={(e) => setMissingFirst(e.target.checked)} />
                                    Show tutors missing initials first
                                </label>

                                <div className="filter-group">
                                    <div className="filter-title">Levels</div>
                                    <div className="chip-wrap">
                                        {options.levels.map((l) => (
                                            <button key={l} className={`chip ${levelFilter.includes(l) ? "on" : ""}`} onClick={() => toggleIn(setLevelFilter, l)}>{l}</button>
                                        ))}
                                    </div>
                                </div>

                                <div className="filter-group">
                                    <div className="filter-title">Subjects</div>
                                    <div className="chip-wrap">
                                        {options.subjects.map((s) => (
                                            <button key={s} className={`chip ${subjectFilter.includes(s) ? "on" : ""}`} onClick={() => toggleIn(setSubjectFilter, s)}>{s}</button>
                                        ))}
                                    </div>
                                </div>

                                <div className="filter-group">
                                    <div className="filter-title">Qualifications</div>
                                    <div className="chip-wrap">
                                        {options.quals.map((q) => (
                                            <button key={q} className={`chip ${qualFilter.includes(q) ? "on" : ""}`} onClick={() => toggleIn(setQualFilter, q)}>{q}</button>
                                        ))}
                                    </div>
                                </div>

                                <button className="clear-btn" onClick={clearFilters}>Clear all filters</button>
                            </div>
                        )}

                        {tutors && (
                            <div className="result-count">
                                Showing {visibleTutors.length} of {tutors.length}
                            </div>
                        )}
                    </div>

                    {loadListError && <div className="empty-state">Failed to load tutors. Is the server running?</div>}
                    {tutors && tutors.length === 0 && <div className="empty-state">No approved tutors yet.</div>}
                    {visibleTutors && tutors.length > 0 && visibleTutors.length === 0 && (
                        <div className="empty-state">No tutors match your search or filters.</div>
                    )}
                    {visibleTutors && visibleTutors.map((t) => (
                        <div
                            key={t._id}
                            className={`tutor-item ${t._id === selectedId ? "active" : ""}`}
                            onClick={() => selectTutor(t._id)}
                        >
                            <div className="name">{t.fullName} {t.initials ? `(${t.initials})` : ""}</div>
                            <div className="meta">{t.phone}</div>
                            {!t.initials && <span className="missing-tag">Missing Initials</span>}
                            {t.blacklisted && <span className="blacklist-tag">Blacklisted</span>}
                        </div>
                    ))}
                </div>

                <div className="main">
                    {!selectedId && <div className="placeholder">Select a tutor from the list to view details.</div>}
                    {selectedId && detailLoading && <div className="placeholder">Loading...</div>}
                    {selectedId && detailError && <div className="placeholder">Failed to load this tutor.</div>}

                    {selectedTutor && !detailLoading && !editing && (
                        <div className="detail-layout">
                        <div className="detail-card" ref={detailCardRef}>
                            <h2>{selectedTutor.fullName}</h2>
                            {selectedTutor.blacklisted && (
                                <div className="blacklist-box">
                                    <strong>⛔ Blacklisted</strong> on {formatDate(selectedTutor.blacklistedAt)}
                                    {selectedTutor.blacklistedBy ? ` by ${selectedTutor.blacklistedBy}` : ""}
                                    <div className="blacklist-reason">Reason: {selectedTutor.blacklistReason}</div>
                                </div>
                            )}

                            <div className="field-row">
                                <div className="label">Initials</div>
                                <div className="value">
                                    {selectedTutor.initials
                                        ? selectedTutor.initials
                                        : <span className="missing-flag">⚠ Missing</span>}
                                </div>
                            </div>
                            <div className="field-row"><div className="label">Phone</div><div className="value">{selectedTutor.phone}</div></div>
                            <div className="field-row">
                                <div className="label">Level(s) Taught</div>
                                <div className="value pill-list">
                                    {(selectedTutor.levels || []).map((l) => <span className="pill" key={l}>{l}</span>)}
                                </div>
                            </div>
                            <div className="field-row">
                                <div className="label">Subject(s) Taught</div>
                                <div className="value pill-list">
                                    {(selectedTutor.subjects || []).map((s) => <span className="pill" key={s}>{s}</span>)}
                                </div>
                            </div>
                            <div className="field-row">
                                <div className="label">Qualifications</div>
                                <div className="value pill-list">
                                    {[].concat(selectedTutor.qualifications || []).map((q) => <span className="pill" key={q}>{q}</span>)}
                                </div>
                            </div>
                            <div className="field-row"><div className="label">Rate</div><div className="value">${selectedTutor.hourlyRate}/hour</div></div>
                            <div className="field-row"><div className="label">Notified on Telegram</div><div className="value">{selectedTutor.notified ? "Yes" : "No"}</div></div>

                            <button className="edit-btn" onClick={startEditing}>Edit Name / Initials / Phone</button>
                            {selectedTutor.blacklisted ? (
                                <button className="unblacklist-btn" disabled={blacklistSaving} onClick={removeBlacklist}>
                                    Remove from blacklist
                                </button>
                            ) : (
                                <>
                                    {!blacklistOpen && (
                                        <button className="blacklist-btn" onClick={() => { setBlacklistOpen(true); setBanner(null); }}>
                                            Blacklist tutor
                                        </button>
                                    )}
                                    {blacklistOpen && (
                                        <div className="blacklist-form">
                                            <label>Reason for blacklist *</label>
                                            <textarea
                                                placeholder="e.g. No-show for trial lesson twice."
                                                value={blacklistReason}
                                                onChange={(e) => setBlacklistReason(e.target.value)}
                                            />
                                            <div className="edit-actions">
                                                <button className="blacklist-confirm-btn" disabled={blacklistSaving} onClick={submitBlacklist}>
                                                    {blacklistSaving ? "Saving..." : "Confirm blacklist"}
                                                </button>
                                                <button className="cancel-btn" onClick={() => { setBlacklistOpen(false); setBlacklistReason(""); }}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {banner && <div className={`status-banner ${banner.type}`}>{banner.text}</div>}
                        </div>

                        <div
                            className="jobs-panel"
                            style={jobsMaxHeight ? { maxHeight: `${jobsMaxHeight}px` } : undefined}
                        >
                            <div className="jobs-section">
                                <h3>Confirmed Jobs ({tutorJobs.length})</h3>

                                {jobsLoading && <p className="jobs-loading">Loading...</p>}
                                {!jobsLoading && tutorJobs.length === 0 && (
                                    <p className="jobs-empty">No confirmed jobs yet.</p>
                                )}

                                {!jobsLoading && tutorJobs.map((j) => (
                                    <div key={j.code} className="job-row">
                                        <div className="job-row-title">{j.level} {(j.subjects || []).join(", ")}</div>
                                        <div className="job-row-line">Day & Time: {j.dayTime}</div>
                                        <div className="job-row-line">Student: {j.parent ? j.parent.studentName : "—"}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    )}

                    {selectedTutor && editing && (
                        <div className="detail-card edit-form">
                            <h2>Edit {selectedTutor.fullName}</h2>

                            <div className="field-row">
                                <div className="label">Full Name</div>
                                <input type="text" value={draft.fullName} onChange={(e) => setDraft((p) => ({ ...p, fullName: e.target.value }))} />
                            </div>
                            <div className="field-row">
                                <div className="label">Initials</div>
                                <input type="text" placeholder="e.g. JK" value={draft.initials} onChange={(e) => setDraft((p) => ({ ...p, initials: e.target.value }))} />
                            </div>
                            <div className="field-row">
                                <div className="label">Phone</div>
                                <input type="text" value={draft.phone} onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))} />
                            </div>

                            <div className="edit-actions">
                                <button className="save-btn" disabled={saving} onClick={saveEdits}>{saving ? "Saving..." : "Save"}</button>
                                <button className="cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
                            </div>

                            {banner && <div className={`status-banner ${banner.type}`}>{banner.text}</div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
