import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";
import Header from "../components/Header.jsx";

function formatDateOnly(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-SG", {
        day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore",
    });
}

function toDateInputValue(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function ConfirmedJobs() {
    const navigate = useNavigate();

    const [jobs, setJobs] = useState(null);
    const [loadListError, setLoadListError] = useState(false);

    const [currentCode, setCurrentCode] = useState(null);
    const [jobDetail, setJobDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState(false);

    const [dateStartEditing, setDateStartEditing] = useState(false);
    const [dateStartDraft, setDateStartDraft] = useState("");
    const [dateStartSaving, setDateStartSaving] = useState(false);

    const [notesDraft, setNotesDraft] = useState("");
    const [notesSaving, setNotesSaving] = useState(false);

    const [unconfirming, setUnconfirming] = useState(false);

    async function loadJobList() {
        try {
            const res = await apiFetch("/admin/jobs/confirmed/list");
            if (!res.ok) throw new Error("Failed to load list");
            const data = await res.json();
            setJobs(data);
            setLoadListError(false);
        } catch (err) {
            setLoadListError(true);
            console.error(err);
        }
    }

    useEffect(() => {
        loadJobList();
    }, []);

    async function selectJob(code) {
        setCurrentCode(code);
        setJobDetail(null);
        setDetailLoading(true);
        setDetailError(false);
        setDateStartEditing(false);

        try {
            const res = await apiFetch(`/admin/job/${code}`);
            if (!res.ok) throw new Error("Failed to fetch job");
            const data = await res.json();
            setJobDetail(data.job);
            setDateStartDraft(toDateInputValue(data.job.dateStart));
            setNotesDraft(data.job.notes || "");
        } catch (err) {
            setDetailError(true);
            console.error(err);
        } finally {
            setDetailLoading(false);
        }
    }

    async function saveDateStart(clear = false) {
        if (!currentCode) return;
        if (!clear && !dateStartDraft) {
            alert("Please pick a date first.");
            return;
        }
        setDateStartSaving(true);
        try {
            const res = await apiFetch(`/admin/job/${currentCode}/date-start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dateStart: clear ? "" : dateStartDraft }),
            });
            const data = await res.json();
            if (res.ok) {
                setDateStartEditing(false);
                await selectJob(currentCode);
            } else {
                alert(data.error || "Failed to update Date Start.");
            }
        } catch (err) {
            alert("Could not reach the server.");
            console.error(err);
        } finally {
            setDateStartSaving(false);
        }
    }

    async function saveNotes() {
        if (!currentCode) return;
        setNotesSaving(true);
        try {
            const res = await apiFetch(`/admin/job/${currentCode}/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: notesDraft }),
            });
            const data = await res.json();
            if (res.ok) {
                setJobDetail((prev) => (prev ? { ...prev, notes: data.job.notes } : prev));
            } else {
                alert(data.error || "Failed to save notes.");
            }
        } catch (err) {
            alert("Could not reach the server.");
            console.error(err);
        } finally {
            setNotesSaving(false);
        }
    }

    async function unconfirmJob() {
        if (!currentCode) return;
        if (!window.confirm("Move this job back to Job Listings?")) return;
        setUnconfirming(true);
        try {
            const res = await apiFetch(`/admin/job/${currentCode}/unconfirm`, { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                navigate("/admin/jobs");
            } else {
                alert(data.error || "Failed to update job.");
            }
        } catch (err) {
            alert("Could not reach the server.");
            console.error(err);
        } finally {
            setUnconfirming(false);
        }
    }

    return (
        <div className="confirmed-jobs-page">
            <Header />
            <style>{`
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                :root {
                    --bg: #F7F6F2; --surface: #FFFFFF; --border: #E2E0D9; --accent: #2A6FDB;
                    --accent-dk: #1F57AF; --text: #1A1A1A; --muted: #6B6B6B;
                    --approve: #1E7E4A; --approve-dk: #166238; --deny: #C0392B;
                }
                body { background: var(--bg); }
                .confirmed-jobs-page { font-family: 'Segoe UI', system-ui, sans-serif; color: var(--text); min-height: 100vh; padding-top: 56px; }
                .layout { display: grid; grid-template-columns: minmax(300px, 20%) 1fr; min-height: 100vh; }
                @media (max-width: 800px) {
                    .layout { grid-template-columns: 1fr; }
                    .sidebar { position: static; height: auto; }
                }
                .sidebar { background: var(--surface); border-right: 1px solid var(--border); overflow-y: auto; position: sticky; top: 56px; height: calc(100vh - 56px); align-self: start; }
                .sidebar-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); }
                .sidebar-header a.back-link { font-size: 0.75rem; color: var(--muted); text-decoration: none; }
                .sidebar-header h1 { font-size: 1.1rem; font-weight: 600; margin-top: 0.3rem; }
                .job-item { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; }
                .job-item:hover { background: #F2F4F8; }
                .job-item.active { background: #EEF3FC; border-left: 3px solid var(--accent); }
                .job-item .title { font-weight: 700; font-size: 0.95rem; }
                .job-item .meta { font-size: 0.78rem; color: var(--muted); margin-top: 0.25rem; line-height: 1.5; }
                .empty-state { padding: 2rem 1.5rem; text-align: center; color: var(--muted); font-size: 0.85rem; }
                .main { padding: 2rem; overflow-y: auto; }
                .placeholder { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--muted); font-size: 0.95rem; }
                .detail-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 2rem; max-width: min(720px, 90%); }
                .detail-card h2 { font-size: 1.4rem; margin-bottom: 0.4rem; }
                .detail-card .code-tag { font-size: 0.85rem; color: var(--muted); margin-bottom: 1.25rem; }
                .field-row { display: grid; grid-template-columns: minmax(110px, 25%) 1fr; gap: 0.5rem; padding: 0.6rem 0; border-bottom: 1px solid var(--border); font-size: 0.9rem; align-items: center; }
                .field-row:last-of-type { border-bottom: none; }
                .field-row .label { color: var(--muted); font-weight: 500; }
                .field-row .value { word-break: break-word; }
                .edit-link { background: none; border: none; color: var(--accent); font-size: 0.78rem; font-weight: 600; cursor: pointer; margin-left: 0.6rem; }
                .date-edit input { padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.85rem; outline: none; }
                .date-edit input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(42, 111, 219, 0.12); }
                .date-actions { display: flex; gap: 0.5rem; margin-top: 0.4rem; }
                .date-actions button { padding: 0.35rem 0.8rem; border: none; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; }
                .date-save { background: var(--approve); color: #fff; }
                .date-cancel { background: none; border: 1px solid var(--border) !important; color: var(--muted); }
                .tutor-card { margin-top: 1.75rem; padding-top: 1.25rem; border-top: 1px solid var(--border); }
                .tutor-card h3 { font-size: 1.05rem; margin-bottom: 0.75rem; }
                .notes-section { margin-top: 1.75rem; padding-top: 1.25rem; border-top: 1px solid var(--border); }
                .notes-section h3 { font-size: 1.05rem; margin-bottom: 0.6rem; }
                .notes-textarea { width: 100%; min-height: 80px; padding: 0.6rem 0.8rem; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 0.88rem; resize: vertical; outline: none; }
                .notes-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(42, 111, 219, 0.12); }
                .notes-save-btn { margin-top: 0.5rem; padding: 0.45rem 1rem; border: none; border-radius: 6px; background: var(--accent); color: #fff; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
                .notes-save-btn:hover { background: var(--accent-dk); }
                .notes-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                .unconfirm-btn { margin-top: 1.75rem; background: none; border: 1px solid var(--deny); color: var(--deny); border-radius: 8px; padding: 0.5rem 1rem; font-size: 0.82rem; font-weight: 600; cursor: pointer; }
                .unconfirm-btn:hover { background: #FBEAE8; }
            `}</style>

            <div className="layout">
                <div className="sidebar">
                    <div className="sidebar-header">
                        <Link className="back-link" to="/admin/jobs">← Job Listings</Link>
                        <h1>Confirmed Jobs</h1>
                    </div>

                    <div>
                        {loadListError && <div className="empty-state">Failed to load confirmed jobs. Is the server running?</div>}
                        {jobs && jobs.length === 0 && <div className="empty-state">No confirmed jobs yet.</div>}
                        {jobs && jobs.map((j) => (
                            <div
                                key={j.code}
                                className={`job-item ${j.code === currentCode ? "active" : ""}`}
                                onClick={() => selectJob(j.code)}
                            >
                                <div className="title">{j.code} {j.level} {(j.subjects || []).join(", ")}</div>
                                <div className="meta">
                                    Parent: {j.parent ? j.parent.parentName : "—"} &nbsp;|&nbsp; Student: {j.parent ? j.parent.studentName : "—"}<br />
                                    Tutor: {j.assignedTutor ? j.assignedTutor.fullName : "—"}<br />
                                    Confirmed: {formatDateOnly(j.confirmedAt)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="main">
                    {!currentCode && <div className="placeholder">Select a job from the list to view details.</div>}
                    {currentCode && detailLoading && <div className="placeholder">Loading...</div>}
                    {currentCode && detailError && <div className="placeholder">Failed to load this job.</div>}

                    {jobDetail && !detailLoading && (
                        <div className="detail-card">
                            <h2>{jobDetail.level} {(jobDetail.subjects || []).join(", ")}</h2>
                            <div className="code-tag">{jobDetail.code}</div>

                            <div className="field-row"><div className="label">Location</div><div className="value">{jobDetail.location} ({jobDetail.postalCode})</div></div>
                            <div className="field-row"><div className="label">Days and Time</div><div className="value">{jobDetail.dayTime}</div></div>
                            <div className="field-row"><div className="label">Duration</div><div className="value">{jobDetail.duration} hrs per lesson</div></div>
                            <div className="field-row"><div className="label">Rate</div><div className="value">${jobDetail.rate}/hour</div></div>
                            <div className="field-row"><div className="label">Description</div><div className="value">{jobDetail.details || "-"}</div></div>

                            {jobDetail.parent && (
                                <>
                                    <div className="field-row"><div className="label">Parent</div><div className="value">{jobDetail.parent.parentName} ({jobDetail.parent.parentNumber})</div></div>
                                    <div className="field-row"><div className="label">Student</div><div className="value">{jobDetail.parent.studentName}</div></div>
                                </>
                            )}

                            <div className="field-row">
                                <div className="label">Date Start</div>
                                <div className="value">
                                    {!dateStartEditing && (
                                        <>
                                            {formatDateOnly(jobDetail.dateStart)}
                                            <button
                                                className="edit-link"
                                                onClick={() => { setDateStartDraft(toDateInputValue(jobDetail.dateStart)); setDateStartEditing(true); }}
                                            >
                                                {jobDetail.dateStart ? "Edit" : "Set date"}
                                            </button>
                                        </>
                                    )}
                                    {dateStartEditing && (
                                        <div className="date-edit">
                                            <input type="date" value={dateStartDraft} onChange={(e) => setDateStartDraft(e.target.value)} />
                                            <div className="date-actions">
                                                <button className="date-save" disabled={dateStartSaving} onClick={() => saveDateStart(false)}>Save</button>
                                                {jobDetail.dateStart && (
                                                    <button className="date-cancel" disabled={dateStartSaving} onClick={() => saveDateStart(true)}>Clear</button>
                                                )}
                                                <button className="date-cancel" onClick={() => setDateStartEditing(false)}>Cancel</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {jobDetail.assignedTutor && (
                                <div className="tutor-card">
                                    <h3>Assigned Tutor</h3>
                                    <div className="field-row"><div className="label">Name</div><div className="value">{jobDetail.assignedTutor.fullName}</div></div>
                                    <div className="field-row"><div className="label">Phone</div><div className="value">{jobDetail.assignedTutor.phone}</div></div>
                                    <div className="field-row"><div className="label">Qualifications</div><div className="value">{(jobDetail.assignedTutor.qualifications || []).join(", ")}</div></div>
                                    <div className="field-row"><div className="label">Experience</div><div className="value">{jobDetail.assignedTutor.experience || "—"}</div></div>
                                    <div className="field-row"><div className="label">Rate</div><div className="value">${jobDetail.assignedTutor.hourlyRate ?? "—"}/hour</div></div>
                                </div>
                            )}

                            <div className="notes-section">
                                <h3>Notes</h3>
                                <textarea
                                    className="notes-textarea"
                                    placeholder="Any notes for this job (private, admin only)..."
                                    value={notesDraft}
                                    onChange={(e) => setNotesDraft(e.target.value)}
                                />
                                <button className="notes-save-btn" disabled={notesSaving} onClick={saveNotes}>
                                    {notesSaving ? "Saving..." : "Save Notes"}
                                </button>
                            </div>

                            <button className="unconfirm-btn" disabled={unconfirming} onClick={unconfirmJob}>
                                {unconfirming ? "Moving..." : "Move back to Job Listings"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}