import { useEffect, useMemo, useRef, useState } from "react";
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

function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try { document.execCommand("copy"); }
    catch (err) {
        console.error("Copy failed:", err);
        alert("Couldn't copy automatically — please select and copy the text manually.");
    }
    document.body.removeChild(textarea);
}

function buildPreferredLine(preferredGender, preferredType) {
    const parts = [];
    if (preferredGender) parts.push(preferredGender);
    if (preferredType) parts.push(preferredType);
    if (parts.length === 0) return "No preference";
    return `Prefer ${parts.join(" ")} Teacher`;
}

// Converts a stored date into the "YYYY-MM-DDTHH:mm" string a
// datetime-local input expects, in the browser's own timezone.
function toInputValue(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

const emptyForm = {
    level: "", preferredGender: "", preferredType: "",
    location: "", postalCode: "", rate: "", dayTime: "", start: "",
    frequency: "", duration: "", details: "",
    parentName: "", parentNumber: "", studentName: "", studentNumber: "", email: "", address: "",
};

export default function AdminJobs() {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState(null);
    const [loadListError, setLoadListError] = useState(false);

    const [currentCode, setCurrentCode] = useState(null);
    const [jobDetail, setJobDetail] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState(false);

    const [selectedTutor, setSelectedTutor] = useState(null);
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [levelOptions, setLevelOptions] = useState([]);
    const [subjectOptions, setSubjectOptions] = useState([]);
    const [genderOptions, setGenderOptions] = useState([]);
    const [typeOptions, setTypeOptions] = useState([]);
    const [statusOptions, setStatusOptions] = useState([]);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [formBanner, setFormBanner] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [statusSaving, setStatusSaving] = useState(false);
    const [dayTimeEditing, setDayTimeEditing] = useState(false);
    const [dayTimeDraft, setDayTimeDraft] = useState("");
    const [dayTimeSaving, setDayTimeSaving] = useState(false);

    const [notesDraft, setNotesDraft] = useState("");
    const [notesSaving, setNotesSaving] = useState(false);

    const [trialEditing, setTrialEditing] = useState(false);
    const [trialDraft, setTrialDraft] = useState("");
    const [trialSaving, setTrialSaving] = useState(false);

    const [search, setSearch] = useState("");
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [levelFilter, setLevelFilter] = useState([]);
    const [subjectFilter, setSubjectFilter] = useState([]);
    const [statusFilter, setStatusFilter] = useState([]);

    const detailCardRef = useRef(null);
    const [applicantsMaxHeight, setApplicantsMaxHeight] = useState(null);

    async function loadJobList() {
        try {
            const res = await apiFetch("/admin/jobs/list");
            if (!res.ok) throw new Error("Failed to load list");
            const data = await res.json();
            setJobs(data);
            setLoadListError(false);
        } catch (err) {
            setLoadListError(true);
            console.error(err);
        }
    }

    async function loadOptions() {
        try {
            const [subjectsRes, levelsRes, prefRes, statusRes] = await Promise.all([
                apiFetch("/admin/jobs/subject-options").then((r) => r.json()),
                apiFetch("/admin/jobs/level-options").then((r) => r.json()),
                apiFetch("/admin/jobs/preference-options").then((r) => r.json()),
                apiFetch("/admin/jobs/status-options").then((r) => r.json()),
            ]);
            setSubjectOptions(subjectsRes.subjects);
            setLevelOptions(levelsRes.levels);
            setGenderOptions(prefRes.genders);
            setTypeOptions(prefRes.types);
            setStatusOptions(statusRes.statuses);
        } catch (err) {
            console.error("Failed to load options:", err);
        }
    }

    useEffect(() => {
        loadJobList();
        loadOptions();
        if (!jobDetail || !detailCardRef.current) {
            setApplicantsMaxHeight(null);
            return;
        }

        function updateHeight() {
            // Below this width the two columns stack, so no cap is needed.
            const stacked = window.innerWidth < 900;
            setApplicantsMaxHeight(stacked || !detailCardRef.current ? null : detailCardRef.current.offsetHeight);
        }

        updateHeight();

        const observer = new ResizeObserver(updateHeight);
        observer.observe(detailCardRef.current);
        window.addEventListener("resize", updateHeight);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", updateHeight);
        };
    }, [jobDetail]);

    async function selectJob(code) {
        setCurrentCode(code);
        setSelectedTutor(null);
        setConfirmVisible(false);
        setDayTimeEditing(false);
        setTrialEditing(false);
        setJobDetail(null);
        setDetailLoading(true);
        setDetailError(false);

        try {
            const res = await apiFetch(`/admin/job/${code}`);
            if (!res.ok) throw new Error("Failed to fetch job");
            const data = await res.json();
            setJobDetail(data.job);
            setApplicants(data.applicants);
            setDayTimeDraft(data.job.dayTime);
            setNotesDraft(data.job.notes || "");
            setTrialDraft(toInputValue(data.job.trialLessonDate));
        } catch (err) {
            setDetailError(true);
            console.error(err);
        } finally {
            setDetailLoading(false);
        }
    }

    function selectApplicant(tutor) {
        setSelectedTutor(tutor);
        setConfirmVisible(false);
    }

    function copyApplicant(tutor, index) {
        function showCopied() { setCopiedIndex(index); setTimeout(() => setCopiedIndex(null), 1500); }
        const text = `${tutor.fullName}\nQualifications: ${(tutor.qualifications || []).join(", ")}\nExperience: ${tutor.experience || "—"}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(showCopied).catch(() => { fallbackCopy(text); showCopied(); });
        } else {
            fallbackCopy(text); showCopied();
        }
    }

    async function doAssign() {
        if (!selectedTutor || !currentCode) return;
        try {
            const res = await apiFetch(`/admin/job/${currentCode}/assign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tutorId: selectedTutor._id }),
            });
            const data = await res.json();
            if (res.ok) {
                await loadJobList();
                await selectJob(currentCode);
            } else {
                alert(data.error || "Failed to assign tutor.");
            }
        } catch (err) {
            alert("Could not reach the server.");
            console.error(err);
        }
    }

    async function handleStatusChange(newStatus) {
        if (!currentCode) return;
        setStatusSaving(true);
        try {
            const res = await apiFetch(`/admin/job/${currentCode}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ statusTag: newStatus }),
            });
            const data = await res.json();
            if (res.ok) {
                await loadJobList();
                await selectJob(currentCode);
            } else {
                alert(data.error || "Failed to update status.");
            }
        } catch (err) {
            alert("Could not reach the server.");
            console.error(err);
        } finally {
            setStatusSaving(false);
        }
    }

    async function saveDayTime() {
        if (!currentCode || !dayTimeDraft.trim()) return;
        setDayTimeSaving(true);
        try {
            const res = await apiFetch(`/admin/job/${currentCode}/daytime`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dayTime: dayTimeDraft.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                setDayTimeEditing(false);
                await selectJob(currentCode);
            } else {
                alert(data.error || "Failed to update Day & Time.");
            }
        } catch (err) {
            alert("Could not reach the server.");
            console.error(err);
        } finally {
            setDayTimeSaving(false);
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

    async function confirmJob() {
        if (!currentCode) return;
        if (!window.confirm("Confirm this job? It will move to Confirmed Jobs and no longer appear here.")) return;
        try {
            const res = await apiFetch(`/admin/job/${currentCode}/confirm`, { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                navigate("/admin/jobs/confirmed");
            } else {
                alert(data.error || "Failed to confirm job.");
            }
        } catch (err) {
            alert("Could not reach the server.");
            console.error(err);
        }
    }

    async function saveTrialDate(clear = false) {
    if (!currentCode) return;
    if (!clear && !trialDraft) {
        alert("Please pick a date and time first.");
        return;
    }
    setTrialSaving(true);
    try {
        const res = await apiFetch(`/admin/job/${currentCode}/trial-date`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                trialLessonDate: clear ? "" : new Date(trialDraft).toISOString(),
            }),
        });
        const data = await res.json();
        if (res.ok) {
            setTrialEditing(false);
            await selectJob(currentCode);
        } else {
            alert(data.error || "Failed to update trial lesson date.");
        }
    } catch (err) {
        alert("Could not reach the server.");
        console.error(err);
    } finally {
        setTrialSaving(false);
    }
}

    function toggleSubject(subject) {
        setSelectedSubjects((prev) => prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]);
    }

    function updateField(key, value) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function closeModal() {
        setModalOpen(false);
        setForm(emptyForm);
        setSelectedSubjects([]);
        setFormBanner(null);
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        setFormBanner(null);

        const payload = { ...form, subjects: selectedSubjects };

        try {
            const res = await apiFetch("/admin/job", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (res.ok) {
                closeModal();
                await loadJobList();
            } else {
                setFormBanner({ type: "error", text: data.error || "Failed to post job." });
            }
        } catch (err) {
            setFormBanner({ type: "error", text: "Could not reach the server." });
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    }

    function toggleIn(setFn, value) {
        setFn((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
    }

    function clearFilters() {
        setSearch("");
        setLevelFilter([]);
        setSubjectFilter([]);
        setStatusFilter([]);
    }

    const visibleJobs = useMemo(() => {
        if (!jobs) return null;
        const q = search.trim().toLowerCase();

        return jobs.filter((j) => {
            if (q) {
                const parentName = (j.parent?.parentName || "").toLowerCase();
                const studentName = (j.parent?.studentName || "").toLowerCase();
                if (!parentName.includes(q) && !studentName.includes(q)) return false;
            }
            // Within one category: match ANY selected value. Across categories: must match ALL.
            if (levelFilter.length > 0 && !levelFilter.includes(j.level)) return false;
            if (statusFilter.length > 0 && !statusFilter.includes(j.statusTag)) return false;
            if (subjectFilter.length > 0 && !subjectFilter.some((s) => (j.subjects || []).includes(s))) return false;
            return true;
        });
    }, [jobs, search, levelFilter, subjectFilter, statusFilter]);

    const activeFilterCount = levelFilter.length + subjectFilter.length + statusFilter.length;
    
    return (
        <div className="admin-jobs-page">
            <Header />
            <style>{`
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                :root {
                    --bg: #F7F6F2; --surface: #FFFFFF; --border: #E2E0D9; --accent: #2A6FDB;
                    --accent-dk: #1F57AF; --text: #1A1A1A; --muted: #6B6B6B; --approve: #1E7E4A;
                    --approve-dk: #166238; --deny: #C0392B; --deny-dk: #9C2E22; --closed-bg: #F0F0F0;
                }
                body { background: var(--bg); }
                .admin-jobs-page { font-family: 'Segoe UI', system-ui, sans-serif; color: var(--text); min-height: 100vh; padding-top: 56px; }
                .layout { display: grid; grid-template-columns: minmax(300px, 20%) 1fr; min-height: 100vh; }
                @media (max-width: 850px) {
                    .layout { grid-template-columns: 1fr; }
                    .sidebar { position: static; height: auto; }
                }
                .sidebar { background: var(--surface); border-right: 1px solid var(--border); overflow-y: auto; display: flex; flex-direction: column; position: sticky; top: 56px; height: calc(100vh - 56px); align-self: start; }
                .sidebar-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); z-index: 2; display: block; }
                .action-bar { display: flex; gap: 0.6rem; padding: 0.9rem 1.5rem; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
                .open-modal-btn { background: var(--accent); color: #fff; border: none; border-radius: 8px; padding: 0.5rem 0.9rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
                .open-modal-btn:hover { background: var(--accent-dk); }
                .confirmed-link { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem 0.9rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; color: var(--text); text-decoration: none; display: inline-flex; align-items: center; }
                .confirmed-link:hover { background: #F2F2F2; }
                .sidebar-header a.back-link { font-size: 0.75rem; color: var(--muted); text-decoration: none; }
                .sidebar-header h1 { font-size: 1.1rem; font-weight: 600; margin-top: 0.3rem; }
                .job-item { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; }
                .job-item:hover { background: #F2F4F8; }
                .job-item.active { background: #EEF3FC; border-left: 3px solid var(--accent); }
                .job-item.closed { opacity: 0.6; }
                .job-item .title { font-weight: 700; font-size: 0.95rem; }
                .job-item .meta { font-size: 0.78rem; color: var(--muted); margin-top: 0.25rem; line-height: 1.5; }
                .status-tag { display: inline-block; font-size: 0.7rem; font-weight: 700; padding: 0.1rem 0.5rem; border-radius: 999px; margin-top: 0.3rem; background: #EEF3FC; color: var(--accent); }
                .status-tag.assigned { background: var(--closed-bg); color: var(--muted); }
                .applicant-count { display: inline-block; font-size: 0.7rem; font-weight: 700; background: #FFF4E5; color: #B36B00; padding: 0.1rem 0.5rem; border-radius: 999px; margin-top: 0.3rem; margin-left: 0.4rem; }
                .empty-state { padding: 2rem 1.5rem; text-align: center; color: var(--muted); font-size: 0.85rem; }
                .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 1.5rem; }
                .modal-card { background: var(--surface); border-radius: 14px; max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; padding: 2rem; }
                .modal-close-btn { position: absolute; top: 1rem; right: 1rem; width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border); background: var(--bg); font-size: 1rem; cursor: pointer; color: var(--muted); line-height: 1; }
                .modal-close-btn:hover { background: #F2F2F2; }
                .modal-card h2 { font-size: 1.15rem; margin-bottom: 1.25rem; }
                .job-form label { display: block; font-size: 0.78rem; font-weight: 600; margin: 0.9rem 0 0.3rem; }
                .job-form .section-label { font-size: 0.85rem; font-weight: 700; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border); }
                .job-form input[type="text"], .job-form input[type="number"], .job-form textarea, .job-form select {
                    width: 100%; padding: 0.55rem 0.7rem; border: 1px solid var(--border); border-radius: 6px;
                    font-size: 0.85rem; font-family: inherit; outline: none;
                }
                .job-form textarea { min-height: 60px; resize: vertical; }
                .job-form input:focus, .job-form textarea:focus, .job-form select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(42, 111, 219, 0.12); }
                .subject-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem 0.6rem; font-size: 0.8rem; margin-top: 0.3rem; }
                .subject-grid label { display: flex; align-items: center; gap: 0.35rem; font-weight: 400; margin: 0; }
                .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
                .submit-job-btn { width: 100%; margin-top: 1.3rem; padding: 0.7rem; border: none; border-radius: 8px; background: var(--approve); color: #fff; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
                .submit-job-btn:hover { background: var(--approve-dk); }
                .submit-job-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                .form-banner { margin-top: 0.8rem; padding: 0.55rem 0.75rem; border-radius: 6px; font-size: 0.8rem; }
                .form-banner.error { background: #FBEAE8; color: var(--deny); }
                .form-banner.success { background: #EAF7EF; color: var(--approve); }
                .main { padding: 2rem; overflow-y: auto; }
                .placeholder { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--muted); font-size: 0.95rem; }
                .detail-layout { display: flex; align-items: flex-start; gap: 1.5rem; flex-wrap: wrap; }
                .detail-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: clamp(1rem, 2.2vw, 2rem); flex: 1 1 420px; max-width: min(720px, 100%); }
                .applicants-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; flex: 1 1 340px; max-width: min(420px, 100%); overflow-y: auto; }
                .applicants-panel .applicants-section { margin-top: 0; }

                @media (max-width: 900px) {
                    .detail-layout { flex-direction: column; }
                    .applicants-panel { max-height: none !important; overflow-y: visible; width: 100%; max-width: 100%; }
                }
                .detail-card h2 { font-size: clamp(1.1rem, 1.7vw, 1.4rem); margin-bottom: 0.3rem; }
                .detail-card .code-tag { font-size: 0.8rem; color: var(--muted); margin-bottom: clamp(0.5rem, 1vw, 1rem); }
                .status-select { padding: 0.4rem 0.7rem; border-radius: 8px; border: 1px solid var(--border); font-size: 0.85rem; font-weight: 600; background: var(--bg); margin-bottom: 1.25rem; }
                .field-row { display: grid; grid-template-columns: minmax(110px, 25%) 1fr; gap: 0.5rem; padding: clamp(0.3rem, 0.8vw, 0.6rem) 0; border-bottom: 1px solid var(--border); font-size: clamp(0.8rem, 1vw, 0.9rem); align-items: center; }
                .field-row:last-of-type { border-bottom: none; }
                .field-row .label { color: var(--muted); font-weight: 500; }
                .field-row .value { word-break: break-word; }
                .edit-link { background: none; border: none; color: var(--accent); font-size: 0.78rem; font-weight: 600; cursor: pointer; margin-left: 0.6rem; }
                .day-time-edit textarea { width: 100%; min-height: 55px; padding: 0.5rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.85rem; font-family: inherit; }
                .day-time-actions { display: flex; gap: 0.5rem; margin-top: 0.4rem; }
                .day-time-actions button { padding: 0.35rem 0.8rem; border: none; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; }
                .day-time-save { background: var(--approve); color: #fff; }
                .day-time-cancel { background: none; border: 1px solid var(--border) !important; color: var(--muted); }
                .assigned-banner { margin-top: 1.25rem; padding: 0.75rem 1rem; background: #EAF7EF; color: var(--approve); border-radius: 8px; font-size: 0.88rem; }
                .applicants-section { margin-top: 2rem; }
                .applicants-section h3 { font-size: 1.05rem; margin-bottom: 0.9rem; }
                .applicant-row { display: flex; align-items: flex-start; gap: 0.9rem; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 1rem 1.2rem; margin-bottom: 0.75rem; transition: border-color 0.15s, background 0.15s; }
                .applicant-row.selectable { cursor: pointer; }
                .applicant-row.selectable:hover { border-color: var(--accent); }
                .applicant-row.selected { border-color: var(--accent); background: #EEF3FC; }
                .applicant-row input[type="radio"] { margin-top: 0.3rem; flex-shrink: 0; }
                .applicant-info { flex: 1; }
                .applicant-info .name { font-weight: 600; font-size: 0.95rem; margin-bottom: 0.3rem; }
                .rank-badge { display: inline-block; font-size: 0.68rem; font-weight: 700; background: #FFF4E5; color: #B36B00; padding: 0.1rem 0.45rem; border-radius: 999px; margin-left: 0.5rem; }
                .applicant-info .detail-line { font-size: 0.83rem; color: var(--muted); margin-top: 0.15rem; }
                .copy-btn { flex-shrink: 0; background: none; border: 1px solid var(--border); border-radius: 6px; padding: 0.35rem 0.7rem; font-size: 0.75rem; cursor: pointer; color: var(--muted); align-self: center; }
                .copy-btn:hover { background: #F2F2F2; }
                .copy-btn.copied { color: var(--approve); border-color: var(--approve); }
                .assign-area { margin-top: 1rem; }
                .assign-btn { padding: 0.75rem 1.5rem; border: none; border-radius: 8px; background: var(--accent); color: #fff; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
                .assign-btn:disabled { background: #C9C9C9; cursor: not-allowed; }
                .assign-btn:not(:disabled):hover { background: var(--accent-dk); }
                .confirm-box { margin-top: 0.9rem; padding: 1rem; background: #FFF8E8; border: 1px solid #F0D999; border-radius: 8px; font-size: 0.88rem; }
                .confirm-box .confirm-actions { display: flex; gap: 0.6rem; margin-top: 0.7rem; }
                .confirm-box button { padding: 0.5rem 1rem; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
                .confirm-yes { background: var(--approve); color: #fff; }
                .confirm-yes:hover { background: var(--approve-dk); }
                .confirm-no { background: none; border: 1px solid var(--border) !important; color: var(--muted); }
                .filter-bar { padding: 0.9rem 1.5rem; border-bottom: 1px solid var(--border); background: #FAFAF8; }
                .search-input { width: 100%; padding: 0.55rem 0.7rem; border: 1px solid var(--border); border-radius: 8px; font-size: 0.88rem; outline: none; background: #fff; }
                .search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(42, 111, 219, 0.12); }
                .filter-toolbar { display: flex; gap: 0.6rem; margin-top: 0.6rem; align-items: center; }
                .filter-toggle { background: #fff; border: 1px solid var(--border); border-radius: 6px; padding: 0.3rem 0.65rem; font-size: 0.78rem; font-weight: 600; cursor: pointer; color: var(--text); }
                .chip { background: #fff; border: 1px solid var(--border); border-radius: 999px; padding: 0.2rem 0.65rem; font-size: 0.75rem; cursor: pointer; color: var(--muted); }
                .chip:hover { border-color: var(--accent); color: var(--accent); }
                .chip.on { background: var(--accent); border-color: var(--accent); color: #fff; }
                .filter-panel { margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px solid var(--border); }
                .filter-group { margin-bottom: 0.8rem; }
                .filter-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 0.35rem; }
                .chip-wrap { display: flex; flex-wrap: wrap; gap: 0.3rem; }
                .clear-btn { background: none; border: none; color: var(--accent); font-size: 0.78rem; font-weight: 600; cursor: pointer; padding: 0; }
                .result-count { font-size: 0.75rem; color: var(--muted); margin-top: 0.6rem; }
                .trial-input { width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.85rem; font-family: inherit; outline: none; }
                .trial-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(42, 111, 219, 0.12); }
                .confirm-job-btn { display: block; margin-top: 1rem; padding: 0.65rem 1.2rem; border: none; border-radius: 8px; background: var(--approve); color: #fff; font-size: 0.88rem; font-weight: 600; cursor: pointer; }
                .confirm-job-btn:hover { background: var(--approve-dk); }
                .notes-section { margin-top: clamp(0.75rem, 1.5vw, 1.5rem); padding-top: clamp(0.6rem, 1.2vw, 1.25rem); border-top: 1px solid var(--border); }
                .notes-title { font-size: 1rem; font-weight: 600; margin-bottom: 0.6rem; }
                .notes-textarea { width: 100%; min-height: 80px; padding: 0.6rem 0.8rem; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 0.88rem; resize: vertical; outline: none; }
                .notes-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(42, 111, 219, 0.12); }
                .notes-save-btn { margin-top: 0.5rem; padding: 0.45rem 1rem; border: none; border-radius: 6px; background: var(--accent); color: #fff; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
                .notes-save-btn:hover { background: var(--accent-dk); }
                .notes-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                .confirmed-link { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem 0.9rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; color: var(--text); text-decoration: none; display: inline-block; }
            `}</style>

            <div className="layout">
                <div className="sidebar">
                    <div className="sidebar-header">
                        <Link className="back-link" to="/admin/dashboard">← Dashboard</Link>
                        <h1>Job Listings</h1>
                    </div>

                    <div className="action-bar">
                        <button className="open-modal-btn" onClick={() => setModalOpen(true)}>+ Post New Job</button>
                        <Link className="confirmed-link" to="/admin/jobs/confirmed">✅ Confirmed Jobs</Link>
                    </div>
                        <div className="filter-bar">
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search parent or student name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />

                            <div className="filter-toolbar">
                                <button className="filter-toggle" onClick={() => setFiltersOpen((o) => !o)}>
                                    Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""} {filtersOpen ? "▲" : "▼"}
                                </button>
                                {(activeFilterCount > 0 || search) && (
                                    <button className="clear-btn" onClick={clearFilters}>Clear all</button>
                                )}
                            </div>

                            {filtersOpen && (
                                <div className="filter-panel">
                                    <div className="filter-group">
                                        <div className="filter-title">Status</div>
                                        <div className="chip-wrap">
                                            {statusOptions.map((s) => (
                                                <button key={s} className={`chip ${statusFilter.includes(s) ? "on" : ""}`} onClick={() => toggleIn(setStatusFilter, s)}>{s}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="filter-group">
                                        <div className="filter-title">Level</div>
                                        <div className="chip-wrap">
                                            {levelOptions.map((l) => (
                                                <button key={l} className={`chip ${levelFilter.includes(l) ? "on" : ""}`} onClick={() => toggleIn(setLevelFilter, l)}>{l}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="filter-group">
                                        <div className="filter-title">Subject</div>
                                        <div className="chip-wrap">
                                            {subjectOptions.map((s) => (
                                                <button key={s} className={`chip ${subjectFilter.includes(s) ? "on" : ""}`} onClick={() => toggleIn(setSubjectFilter, s)}>{s}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {jobs && (
                                <div className="result-count">Showing {visibleJobs.length} of {jobs.length}</div>
                            )}
                        </div>

                    <div>
                        {loadListError && <div className="empty-state">Failed to load jobs. Is the server running?</div>}
                        {jobs && jobs.length === 0 && <div className="empty-state">No jobs posted yet.</div>}
                        {visibleJobs && jobs.length > 0 && visibleJobs.length === 0 && (
                            <div className="empty-state">No jobs match your search or filters.</div>
                        )}
                        {visibleJobs && visibleJobs.map((j) => (
                            <div
                                key={j.code}
                                className={`job-item ${j.statusTag === "Tutor Assigned" ? "closed" : ""} ${j.code === currentCode ? "active" : ""}`}
                                onClick={() => selectJob(j.code)}
                            >
                                <div className="title">{j.code} {j.level} {(j.subjects || []).join(", ")}</div>
                                <div className="meta">
                                    Name: {j.parent ? j.parent.parentName : "—"} &nbsp;|&nbsp; Number: {j.parent ? j.parent.parentNumber : "—"}<br />
                                    Date of post: {formatDate(j.postedAt)}
                                </div>
                                <span className={`status-tag ${j.statusTag === "Tutor Assigned" ? "assigned" : ""}`}>{j.statusTag}</span>
                                <span className="applicant-count">{(j.applicants || []).length} applied</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="main">
                    {!currentCode && <div className="placeholder">Select a job from the list to view details.</div>}
                    {currentCode && detailLoading && <div className="placeholder">Loading...</div>}
                    {currentCode && detailError && <div className="placeholder">Failed to load this job.</div>}

                    {jobDetail && !detailLoading && (
                        <div className="detail-layout">
                            <div className="detail-card" ref={detailCardRef}>
                                <h2>{jobDetail.level} {(jobDetail.subjects || []).join(", ")}</h2>
                                <div className="code-tag">{jobDetail.code}</div>

                                <select
                                    className="status-select"
                                    value={jobDetail.statusTag}
                                    disabled={statusSaving}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                >
                                    {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>

                                <div className="field-row"><div className="label">Location</div><div className="value">{jobDetail.location} ({jobDetail.postalCode})</div></div>

                                <div className="field-row">
                                    <div className="label">Days and Time</div>
                                    <div className="value">
                                        {!dayTimeEditing && (
                                            <>
                                                {jobDetail.dayTime}
                                                <button className="edit-link" onClick={() => { setDayTimeDraft(jobDetail.dayTime); setDayTimeEditing(true); }}>Edit</button>
                                            </>
                                        )}
                                        {dayTimeEditing && (
                                            <div className="day-time-edit">
                                                <textarea value={dayTimeDraft} onChange={(e) => setDayTimeDraft(e.target.value)} />
                                                <div className="day-time-actions">
                                                    <button className="day-time-save" disabled={dayTimeSaving} onClick={saveDayTime}>Save</button>
                                                    <button className="day-time-cancel" onClick={() => setDayTimeEditing(false)}>Cancel</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {(jobDetail.statusTag === "Trial Lesson Planned" || jobDetail.trialLessonDate) && (
                                    <div className="field-row">
                                        <div className="label">Trial Lesson Date</div>
                                        <div className="value">
                                            {!trialEditing && (
                                                <>
                                                    {jobDetail.trialLessonDate
                                                        ? formatDate(jobDetail.trialLessonDate)
                                                        : <span style={{ color: "var(--muted)" }}>Not set yet</span>}
                                                    {jobDetail.statusTag === "Trial Lesson Planned" && (
                                                        <button
                                                            className="edit-link"
                                                            onClick={() => { setTrialDraft(toInputValue(jobDetail.trialLessonDate)); setTrialEditing(true); }}
                                                        >
                                                            {jobDetail.trialLessonDate ? "Edit" : "Set date"}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            {trialEditing && (
                                                <div className="day-time-edit">
                                                    <input
                                                        type="datetime-local"
                                                        className="trial-input"
                                                        value={trialDraft}
                                                        onChange={(e) => setTrialDraft(e.target.value)}
                                                    />
                                                    <div className="day-time-actions">
                                                        <button className="day-time-save" disabled={trialSaving} onClick={() => saveTrialDate(false)}>Save</button>
                                                        {jobDetail.trialLessonDate && (
                                                            <button className="day-time-cancel" disabled={trialSaving} onClick={() => saveTrialDate(true)}>Clear</button>
                                                        )}
                                                        <button className="day-time-cancel" onClick={() => setTrialEditing(false)}>Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="field-row"><div className="label">Frequency</div><div className="value">{jobDetail.frequency} Lesson{jobDetail.frequency > 1 ? "s" : ""} a Week</div></div>
                                <div className="field-row"><div className="label">Duration</div><div className="value">{jobDetail.duration} hrs per lesson</div></div>
                                <div className="field-row"><div className="label">Rate</div><div className="value">${jobDetail.rate}/hour</div></div>
                                <div className="field-row"><div className="label">Preferred</div><div className="value">{buildPreferredLine(jobDetail.preferredGender, jobDetail.preferredType)}</div></div>
                                <div className="field-row"><div className="label">Start</div><div className="value">{jobDetail.start}</div></div>
                                <div className="field-row"><div className="label">Description</div><div className="value">{jobDetail.details || "-"}</div></div>
                                {jobDetail.parent && (
                                    <>
                                        <div className="field-row"><div className="label">Parent</div><div className="value">{jobDetail.parent.parentName} ({jobDetail.parent.parentNumber})</div></div>
                                        <div className="field-row"><div className="label">Student</div><div className="value">{jobDetail.parent.studentName}</div></div>
                                    </>
                                )}
                                <div className="field-row"><div className="label">Date Posted</div><div className="value">{formatDate(jobDetail.postedAt)}</div></div>

                                {jobDetail.assignedTutor && (
                                    <div className="assigned-banner">✅ Assigned to {jobDetail.assignedTutor.fullName} on {formatDate(jobDetail.assignedAt)}</div>
                                )}

                                {jobDetail.statusTag === "Tutor Assigned" && jobDetail.assignedTutor && !jobDetail.confirmed && (
                                    <button className="confirm-job-btn" onClick={confirmJob}>Confirm Job</button>
                                )}

                                <div className="notes-section">
                                    <div className="notes-title">Notes</div>
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
                            </div>

                            <div
                                className="applicants-panel"
                                style={applicantsMaxHeight ? { maxHeight: `${applicantsMaxHeight}px` } : undefined}
                            >

                                <div className="applicants-section">
                                    <h3>Applicants ({applicants.length})</h3>

                                    {applicants.length === 0 && <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>No tutors have applied yet.</p>}

                                    {applicants.map((a, i) => {
                                        const canSelect = !jobDetail.assignedTutor;
                                        return (
                                            <div
                                                key={a._id}
                                                className={`applicant-row ${canSelect ? "selectable" : ""} ${selectedTutor && selectedTutor._id === a._id ? "selected" : ""}`}
                                                onClick={canSelect ? () => selectApplicant(a) : undefined}
                                            >
                                                {canSelect && (
                                                    <input type="radio" readOnly checked={!!(selectedTutor && selectedTutor._id === a._id)} />
                                                )}
                                                <div className="applicant-info">
                                                    <div className="name">
                                                        {a.fullName}
                                                        {i < 3 && <span className="rank-badge">Top {i + 1}</span>}
                                                    </div>
                                                    <div className="detail-line">Levels: {(a.levels || []).join(", ") || "—"}</div>
                                                    <div className="detail-line">Subjects: {(a.subjects || []).join(", ") || "—"}</div>
                                                    <div className="detail-line">Qualifications: {(a.qualifications || []).join(", ")}</div>
                                                    <div className="detail-line">Rate: ${a.hourlyRate ?? "—"}/hour &nbsp;|&nbsp; Experience: {a.experience || "—"}</div>
                                                    <div className="detail-line">Number: {a.phone || "—"}</div>
                                                </div>
                                                <button
                                                    className={`copy-btn ${copiedIndex === i ? "copied" : ""}`}
                                                    onClick={(e) => { e.stopPropagation(); copyApplicant(a, i); }}
                                                >
                                                    {copiedIndex === i ? "Copied!" : "Copy"}
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {!jobDetail.assignedTutor && applicants.length > 0 && (
                                        <div className="assign-area">
                                            <button className="assign-btn" disabled={!selectedTutor} onClick={() => setConfirmVisible(true)}>Assign</button>

                                            {confirmVisible && selectedTutor && (
                                                <div className="confirm-box">
                                                    <span>Assign {selectedTutor.fullName}?</span>
                                                    <div className="confirm-actions">
                                                        <button className="confirm-yes" onClick={doAssign}>Confirm</button>
                                                        <button className="confirm-no" onClick={() => setConfirmVisible(false)}>Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {modalOpen && (
                <div className="modal-backdrop">
                    <div className="modal-card">
                        <button className="modal-close-btn" onClick={closeModal}>✕</button>
                        <h2>Post New Job</h2>

                        <form className="job-form" onSubmit={handleFormSubmit}>
                            <label>Level</label>
                            <select required value={form.level} onChange={(e) => updateField("level", e.target.value)}>
                                <option value="">Select a level</option>
                                {levelOptions.map((l) => <option key={l} value={l}>{l}</option>)}
                            </select>

                            <label>Subjects</label>
                            <div className="subject-grid">
                                {subjectOptions.map((s) => (
                                    <label key={s}>
                                        <input type="checkbox" checked={selectedSubjects.includes(s)} onChange={() => toggleSubject(s)} /> {s}
                                    </label>
                                ))}
                            </div>

                            <div className="form-row-2">
                                <div>
                                    <label>Location</label>
                                    <input type="text" placeholder="e.g. Woodlands" required value={form.location} onChange={(e) => updateField("location", e.target.value)} />
                                </div>
                                <div>
                                    <label>Postal Code</label>
                                    <input type="text" placeholder="e.g. 730123" required value={form.postalCode} onChange={(e) => updateField("postalCode", e.target.value)} />
                                </div>
                            </div>

                            <label>Rate ($/hour)</label>
                            <input type="number" min="0" step="1" placeholder="e.g. 30" required value={form.rate} onChange={(e) => updateField("rate", e.target.value)} />

                            <label>Day & Time <span style={{ fontWeight: 400, color: "var(--muted)" }}>(when they're both free — a specific slot can be confirmed later)</span></label>
                            <textarea placeholder="e.g. Monday 5pm-8pm, Wednesday 4pm-6pm, Saturday all day" required value={form.dayTime} onChange={(e) => updateField("dayTime", e.target.value)} />

                            <label>Start</label>
                            <input type="text" placeholder="e.g. ASAP, Nov 2026" required value={form.start} onChange={(e) => updateField("start", e.target.value)} />

                            <div className="form-row-2">
                                <div>
                                    <label>Frequency</label>
                                    <select required value={form.frequency} onChange={(e) => updateField("frequency", e.target.value)}>
                                        <option value="">Select</option>
                                        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                                            <option key={n} value={n}>{n} Lesson{n > 1 ? "s" : ""} a Week</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label>Duration (hrs/lesson)</label>
                                    <input type="number" min="0.5" max="8" step="0.5" placeholder="e.g. 1.5" required value={form.duration} onChange={(e) => updateField("duration", e.target.value)} />
                                </div>
                            </div>

                            <div className="form-row-2">
                                <div>
                                    <label>Preferred Gender</label>
                                    <select value={form.preferredGender} onChange={(e) => updateField("preferredGender", e.target.value)}>
                                        <option value="">No preference</option>
                                        {genderOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label>Preferred Type</label>
                                    <select value={form.preferredType} onChange={(e) => updateField("preferredType", e.target.value)}>
                                        <option value="">No preference</option>
                                        {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            <label>Details</label>
                            <textarea placeholder="Any additional remarks (optional)" value={form.details} onChange={(e) => updateField("details", e.target.value)} />

                            <div className="section-label">Parent Details</div>

                            <label>Parent Name</label>
                            <input type="text" required value={form.parentName} onChange={(e) => updateField("parentName", e.target.value)} />

                            <label>Parent Number</label>
                            <input type="text" required value={form.parentNumber} onChange={(e) => updateField("parentNumber", e.target.value)} />

                            <label>Student Name</label>
                            <input type="text" required value={form.studentName} onChange={(e) => updateField("studentName", e.target.value)} />

                            <label>Student Number <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span></label>
                            <input type="text" value={form.studentNumber} onChange={(e) => updateField("studentNumber", e.target.value)} />

                            <label>Email</label>
                            <input type="text" value={form.email} onChange={(e) => updateField("email", e.target.value)} />

                            <label>Address</label>
                            <input type="text" required value={form.address} onChange={(e) => updateField("address", e.target.value)} />

                            <button type="submit" className="submit-job-btn" disabled={submitting}>
                                {submitting ? "Posting..." : "Post Job"}
                            </button>

                            {formBanner && <div className={`form-banner ${formBanner.type}`}>{formBanner.text}</div>}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
