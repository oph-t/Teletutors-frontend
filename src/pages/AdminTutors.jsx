import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/apiFetch.js";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";

function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleString("en-SG", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
        timeZone: "Asia/Singapore",
    });
}

function formatDateOnly(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-SG", {
        day: "numeric", month: "short", year: "numeric",
        timeZone: "Asia/Singapore",
    });
}

function fileIcon(mimeType) {
    if (mimeType === "application/pdf") return "📄";
    if (mimeType.startsWith("image/")) return "🖼️";
    return "📝";
}

export default function AdminTutors() {
    const [tutors, setTutors] = useState(null); // null = loading, [] = loaded empty
    const [loadListError, setLoadListError] = useState(false);

    const [selectedId, setSelectedId] = useState(null);
    const [selectedTutor, setSelectedTutor] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState(false);

    const [comments, setComments] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [banner, setBanner] = useState(null); // { type: 'success'|'error', text }

    const detailCardRef = useRef(null);
    const [docsMaxHeight, setDocsMaxHeight] = useState(null);
    const [selectedDocId, setSelectedDocId] = useState(null);

    async function loadPendingList() {
        try {
            const res = await apiFetch("/admin/pending");
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
        loadPendingList();
    }, []);

    useEffect(() => {
        if (!selectedTutor || !detailCardRef.current) {
            setDocsMaxHeight(null);
            return;
        }

        function updateHeight() {
            const stacked = window.innerWidth < 900;
            setDocsMaxHeight(stacked || !detailCardRef.current ? null : detailCardRef.current.offsetHeight);
        }

        updateHeight();

        const observer = new ResizeObserver(updateHeight);
        observer.observe(detailCardRef.current);
        window.addEventListener("resize", updateHeight);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", updateHeight);
        };
    }, [selectedTutor]);

    async function selectTutor(id) {
        setSelectedId(id);
        setSelectedTutor(null);
        setDetailLoading(true);
        setDetailError(false);
        setComments("");
        setBanner(null);
        setSelectedDocId(null);

        try {
            const res = await apiFetch(`/admin/tutor/${id}`);
            if (!res.ok) throw new Error("Failed to fetch tutor");
            const t = await res.json();
            setSelectedTutor(t);
        } catch (err) {
            setDetailError(true);
            console.error(err);
        } finally {
            setDetailLoading(false);
        }
    }

    async function submitReview(decision) {
        if (!comments.trim()) {
            setBanner({ type: "error", text: "Please enter a reason before submitting your decision." });
            return;
        }

        setSubmitting(true);
        setBanner({ type: null, text: "Submitting..." });

        try {
            const res = await apiFetch(`/admin/review/${selectedId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ decision, comments }),
            });
            const data = await res.json();

            if (res.ok) {
                setBanner({
                    type: "success",
                    text: data.notified
                        ? `Application ${decision}. Tutor notified on Telegram.`
                        : `Application ${decision}, but Telegram notification failed (tutor may not have started a chat with the bot).`,
                });
                setTimeout(() => {
                    loadPendingList();
                    setSelectedId(null);
                    setSelectedTutor(null);
                }, 1200);
            } else {
                setBanner({ type: "error", text: data.error || "Something went wrong." });
                setSubmitting(false);
            }
        } catch (err) {
            setBanner({ type: "error", text: "Could not reach the server." });
            setSubmitting(false);
            console.error(err);
        }
    }

    return (
        <div className="admin-tutors-page">
            <Header />
            <style>{`
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                :root {
                    --bg: #F7F6F2; --surface: #FFFFFF; --border: #E2E0D9; --accent: #2A6FDB;
                    --text: #1A1A1A; --muted: #6B6B6B; --approve: #1E7E4A; --approve-dk: #166238;
                    --deny: #C0392B; --deny-dk: #9C2E22;
                }
                body { background: var(--bg); }
                .admin-tutors-page { font-family: 'Segoe UI', system-ui, sans-serif; color: var(--text); min-height: 100vh; padding-top: 56px; }
                .layout { display: grid; grid-template-columns: minmax(200px, 20%) 1fr; min-height: 100vh; }
                @media (max-width: 800px) {
                    .layout { grid-template-columns: 1fr; }
                    .sidebar { position: static; height: auto; }
                }
                .sidebar { background: var(--surface); border-right: 1px solid var(--border); overflow-y: auto; position: sticky; top: 56px; height: calc(100vh - 56px); align-self: start; }
                .sidebar-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); }
                .sidebar-header h1 { font-size: 1.1rem; font-weight: 600; margin-top: 0.3rem; }
                .sidebar-header p { font-size: 0.8rem; color: var(--muted); margin-top: 0.25rem; }
                .back-link { font-size: 0.75rem; color: var(--muted); text-decoration: none; }
                .logout-btn { background: none; border: 1px solid var(--border); border-radius: 6px; padding: 0.3rem 0.6rem; font-size: 0.75rem; cursor: pointer; color: var(--muted); }
                .tutor-item { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; }
                .tutor-item:hover { background: #F2F4F8; }
                .tutor-item.active { background: #EEF3FC; border-left: 3px solid var(--accent); }
                .tutor-item .name { font-weight: 600; font-size: 0.95rem; }
                .tutor-item .meta { font-size: 0.8rem; color: var(--muted); margin-top: 0.2rem; }
                .empty-state { padding: 3rem 1.5rem; text-align: center; color: var(--muted); font-size: 0.9rem; }
                .main { padding: 2rem; overflow-y: auto; }
                .placeholder { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--muted); font-size: 0.95rem; }
                .detail-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 2rem; max-width: min(640px, 90%); }
                .detail-card h2 { font-size: 1.4rem; margin-bottom: 1.25rem; }
                .field-row { display: grid; grid-template-columns: minmax(110px, 28%) 1fr; gap: 0.5rem; padding: 0.6rem 0; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
                .field-row:last-of-type { border-bottom: none; }
                .field-row .label { color: var(--muted); font-weight: 500; }
                .field-row .value { word-break: break-word; }
                .pill-list { display: flex; flex-wrap: wrap; gap: 0.35rem; }
                .pill { background: #EEF3FC; color: var(--accent); padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.8rem; font-weight: 500; }
                .review-section { margin-top: 1.75rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
                .review-section label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; }
                textarea#comments { width: 100%; min-height: 90px; padding: 0.7rem 0.85rem; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 0.9rem; resize: vertical; outline: none; }
                textarea#comments:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(42, 111, 219, 0.12); }
                .action-row { display: flex; gap: 0.75rem; margin-top: 1rem; }
                .btn { flex: 1; padding: 0.75rem; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
                .btn-approve { background: var(--approve); color: #fff; }
                .btn-approve:hover { background: var(--approve-dk); }
                .btn-deny { background: var(--deny); color: #fff; }
                .btn-deny:hover { background: var(--deny-dk); }
                .btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .status-banner { margin-top: 1rem; padding: 0.7rem 0.9rem; border-radius: 8px; font-size: 0.85rem; }
                .status-banner.success { background: #EAF7EF; color: var(--approve); }
                .status-banner.error { background: #FBEAE8; color: var(--deny); }
                .detail-layout { display: flex; align-items: flex-start; gap: 1.5rem; flex-wrap: wrap; }
                .docs-list-section { margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border); }
                .docs-list-title { font-size: 0.85rem; font-weight: 600; margin-bottom: 0.6rem; }
                .doc-item { display: flex; align-items: center; gap: 0.5rem; width: 100%; text-align: left; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.85rem; cursor: pointer; margin-bottom: 0.4rem; }
                .doc-item:hover { border-color: var(--accent); }
                .doc-item.active { background: #EEF3FC; border-color: var(--accent); }
                .doc-icon { font-size: 1rem; }
                .doc-name { word-break: break-word; }
                .docs-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; flex: 1 1 320px; max-width: min(420px, 100%); overflow: hidden; display: flex; }
                .docs-placeholder { margin: auto; padding: 2rem; text-align: center; color: var(--muted); font-size: 0.88rem; }
                .doc-download-link { display: inline-block; margin-top: 0.75rem; color: var(--accent); font-weight: 600; text-decoration: none; }
                .doc-frame { width: 100%; border: none; flex: 1; min-height: 500px; }
                .doc-image { width: 100%; height: auto; object-fit: contain; }

                @media (max-width: 900px) {
                    .detail-layout { flex-direction: column; }
                    .docs-panel { max-height: none !important; }
                }
            `}</style>

            <div className="layout">
                <div className="sidebar">
                    <div className="sidebar-header">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <Link className="back-link" to="/admin/dashboard">← Dashboard</Link>
                                <h1>Pending Applications</h1>
                                <p>{tutors === null ? "Loading..." : `${tutors.length} awaiting review`}</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        {loadListError && <div className="empty-state">Failed to load applications. Is the server running?</div>}
                        {tutors && tutors.length === 0 && <div className="empty-state">No pending applications right now.</div>}
                        {tutors && tutors.map((t) => (
                            <div
                                key={t._id}
                                className={`tutor-item ${t._id === selectedId ? "active" : ""}`}
                                onClick={() => selectTutor(t._id)}
                            >
                                <div className="name">{t.fullName}</div>
                                <div className="meta">{formatDate(t.appliedAt)} · {(t.subjects || []).slice(0, 2).join(", ")}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="main">
                    {!selectedId && <div className="placeholder">Select an application from the list to review it.</div>}

                    {selectedId && detailLoading && <div className="placeholder">Loading...</div>}
                    {selectedId && detailError && <div className="placeholder">Failed to load this application.</div>}

                    {selectedTutor && !detailLoading && (
                        <div className="detail-layout">
                        <div className="detail-card" ref={detailCardRef}>
                            <h2>{selectedTutor.fullName}</h2>

                            <div className="field-row">
                                <div className="label">Date of Birth</div>
                                <div className="value">{formatDateOnly(selectedTutor.dateOfBirth)} (Age {selectedTutor.age})</div>
                            </div>
                            <div className="field-row">
                                <div className="label">Phone</div>
                                <div className="value">{selectedTutor.phone}</div>
                            </div>
                            <div className="field-row">
                                <div className="label">Telegram ID</div>
                                <div className="value">{selectedTutor.telegramId}</div>
                            </div>
                            <div className="field-row">
                                <div className="label">Levels</div>
                                <div className="value pill-list">
                                    {(selectedTutor.levels || []).map((l) => <span className="pill" key={l}>{l}</span>)}
                                </div>
                            </div>
                            <div className="field-row">
                                <div className="label">Subjects</div>
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
                            <div className="field-row">
                                <div className="label">Experience</div>
                                <div className="value">{selectedTutor.experience}</div>
                            </div>
                            <div className="field-row">
                                <div className="label">Applied</div>
                                <div className="value">{formatDate(selectedTutor.appliedAt)}</div>
                            </div>

                            {selectedTutor.documents && selectedTutor.documents.length > 0 && (
                                <div className="docs-list-section">
                                    <div className="docs-list-title">Submitted Documents</div>
                                    {selectedTutor.documents.map((d) => (
                                        <button
                                            key={d._id}
                                            className={`doc-item ${selectedDocId === d._id ? "active" : ""}`}
                                            onClick={() => setSelectedDocId(d._id)}
                                        >
                                            <span className="doc-icon">{fileIcon(d.mimeType)}</span>
                                            <span className="doc-name">{d.originalName}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="review-section">
                                <label htmlFor="comments">Reason for decision *</label>
                                <textarea
                                    id="comments"
                                    placeholder="e.g. Strong experience and qualifications, good fit for Secondary Maths."
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                />

                                <div className="action-row">
                                    <button className="btn btn-approve" disabled={submitting} onClick={() => submitReview("approved")}>Approve</button>
                                    <button className="btn btn-deny" disabled={submitting} onClick={() => submitReview("rejected")}>Deny</button>
                                </div>

                                {banner && (
                                    <div className={`status-banner ${banner.type || ""}`}>{banner.text}</div>
                                )}
                            </div>
                        </div>
                        <div
                            className="docs-panel"
                                style={docsMaxHeight ? { maxHeight: `${docsMaxHeight}px` } : undefined}
                            >
                                {!selectedDocId && (
                                    <div className="docs-placeholder">Select a document to preview it here.</div>
                                )}
                                {selectedDocId && (() => {
                                    const doc = selectedTutor.documents.find((d) => d._id === selectedDocId);
                                    if (!doc) return null;
                                    const url = `/admin/tutor/${selectedId}/document/${doc._id}`;
                                    if (doc.mimeType === "application/pdf") {
                                        return <iframe className="doc-frame" src={url} title={doc.originalName} />;
                                    }
                                    if (doc.mimeType.startsWith("image/")) {
                                        return <img className="doc-image" src={url} alt={doc.originalName} />;
                                    }
                                    return (
                                        <div className="docs-placeholder">
                                            <p>Preview isn't available for Word documents.</p>
                                            <a className="doc-download-link" href={url} target="_blank" rel="noreferrer">Open / Download {doc.originalName}</a>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
