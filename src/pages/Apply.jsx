import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const LEVELS = ["Kindergarten", "Primary", "Lower Secondary", "Upper Secondary", "JC", "IB", "Adult"];

const SUBJECTS = [
    { value: "Mathematics", label: "Mathematics" },
    { value: "Additional Mathematics", label: "Add Maths" },
    { value: "English", label: "English" },
    { value: "Chinese", label: "Chinese" },
    { value: "Malay", label: "Malay" },
    { value: "Tamil", label: "Tamil" },
    { value: "Science", label: "Science" },
    { value: "Physics", label: "Physics" },
    { value: "Chemistry", label: "Chemistry" },
    { value: "Biology", label: "Biology" },
    { value: "History", label: "History" },
    { value: "Geography", label: "Geography" },
    { value: "Economics", label: "Economics" },
    { value: "Literature", label: "Literature" },
];

// IMPORTANT: values must match the Tutor schema's `qualifications` enum
// EXACTLY (case-sensitive), or Mongoose will reject the submission.
const QUALIFICATIONS = [
    { value: "PhD", label: "PhD" },
    { value: "Masters", label: "Masters" },
    { value: "Degree", label: "Degree" },
    { value: "A-Level", label: "A-Level" },
    { value: "O-Level", label: "O-Level" },
    { value: "Polytechnic Certificate", label: "Polytechnic" },
    { value: "N-level", label: "N-Level" },
    { value: "N(A)-Level", label: "N(A)-Level" },
    { value: "N(T)-Level", label: "N(T)-Level" },
];

function TagGroup({ options, selected, onToggle, error }) {
    return (
        <>
            <div className="tag-group">
                {options.map((opt) => {
                    const value = typeof opt === "string" ? opt : opt.value;
                    const label = typeof opt === "string" ? opt : opt.label;
                    return (
                        <span
                            key={value}
                            className={`tag ${selected.includes(value) ? "selected" : ""}`}
                            onClick={() => onToggle(value)}
                        >
                            {label}
                        </span>
                    );
                })}
            </div>
            {error && <div className="field-error visible">{error}</div>}
        </>
    );
}

export default function Apply() {
    const [telegramId, setTelegramId] = useState(null);

    const [fullName, setFullName] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [phone, setPhone] = useState("");
    const [experience, setExperience] = useState("");
    const [hourlyRate, setHourlyRate] = useState("");

    const [levels, setLevels] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [qualifications, setQualifications] = useState([]);

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [screen, setScreen] = useState("form"); // 'form' | 'success' | 'error'
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setTelegramId(params.get("telegramId"));
    }, []);

    function toggle(setFn, list) {
        return (value) => setFn(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
    }

    function computeAge(dobStr) {
        const dob = new Date(dobStr);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        return age;
    }

    function validate() {
        const next = {};

        if (!fullName.trim()) next.fullName = "Full name is required.";

        if (!dateOfBirth) {
            next.dateOfBirth = "Date of birth is required.";
        } else {
            const age = computeAge(dateOfBirth);
            if (age < 16) next.dateOfBirth = "Tutor must be at least 16 years old.";
            if (age > 65) next.dateOfBirth = "Age cannot exceed 65.";
        }

        if (!phone.trim()) next.phone = "Phone number is required.";
        else if (!/^\+?[0-9\s]{7,15}$/.test(phone.trim())) next.phone = "Enter a valid phone number.";

        if (levels.length === 0) next.levels = "Select at least one level.";
        if (subjects.length === 0) next.subjects = "Select at least one subject.";
        if (!experience.trim()) next.experience = "Please describe your teaching experience.";
        if (!hourlyRate || Number(hourlyRate) <= 0) next.hourlyRate = "Enter a valid hourly rate.";
        if (qualifications.length === 0) next.qualifications = "Select at least one qualification.";

        setErrors(next);
        return Object.keys(next).length === 0;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);

        const payload = {
            telegramId,
            fullName: fullName.trim(),
            dateOfBirth: new Date(dateOfBirth).toISOString(),
            age: computeAge(dateOfBirth),
            phone: phone.trim(),
            hourlyRate: Number(hourlyRate),
            levels,
            subjects,
            qualifications,
            experience: experience.trim(),
        };

        try {
            const res = await fetch("/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (res.ok) {
                setScreen("success");
            } else {
                setErrorMessage(data.error || "Submission failed. Please try again.");
                setScreen("error");
                setSubmitting(false);
            }
        } catch (err) {
            setErrorMessage("Could not reach the server. Please try again.");
            setScreen("error");
            setSubmitting(false);
            console.error(err);
        }
    }

    const styles = `
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
            --bg: #F7F6F2; --surface: #FFFFFF; --border: #E2E0D9; --accent: #2A6FDB;
            --accent-dk: #1A4FA0; --text: #1A1A1A; --muted: #6B6B6B; --error: #C0392B;
            --success: #1E7E4A; --tag-bg: #EEF3FC; --tag-active: #2A6FDB;
        }
        body { background: var(--bg); }
        .apply-page { font-family: 'DM Sans', sans-serif; color: var(--text); min-height: 100vh; padding: 2rem 1rem 4rem; }
        header { text-align: center; margin-bottom: 2.5rem; }
        header .wordmark { font-family: 'DM Serif Display', serif; font-size: 1.5rem; color: var(--accent); letter-spacing: -0.02em; margin-bottom: 0.5rem; }
        header h1 { font-size: 2rem; font-weight: 600; letter-spacing: -0.03em; line-height: 1.2; }
        header p { color: var(--muted); margin-top: 0.5rem; font-size: 0.95rem; }
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 2rem; max-width: 640px; margin: 0 auto 1.5rem; }
        .card-title { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border); }
        .field { margin-bottom: 1.25rem; }
        .field:last-child { margin-bottom: 0; }
        label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.4rem; }
        label .required { color: var(--error); margin-left: 2px; }
        label .hint { font-weight: 400; color: var(--muted); font-size: 0.8rem; margin-left: 0.35rem; }
        input[type="text"], input[type="tel"], input[type="date"], input[type="number"], textarea {
            width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border); border-radius: 8px;
            font-family: 'DM Sans', sans-serif; font-size: 0.95rem; color: var(--text); background: var(--bg);
            transition: border-color 0.15s, box-shadow 0.15s; outline: none;
        }
        input:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(42, 111, 219, 0.12); background: #fff; }
        input.error, textarea.error { border-color: var(--error); }
        textarea { resize: vertical; min-height: 80px; }
        .field-error { font-size: 0.8rem; color: var(--error); margin-top: 0.3rem; }
        .tag-group { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.25rem; }
        .tag {
            padding: 0.4rem 0.85rem; border: 1.5px solid var(--border); border-radius: 999px;
            font-size: 0.85rem; font-weight: 500; cursor: pointer; background: var(--bg); color: var(--text);
            transition: all 0.15s; user-select: none;
        }
        .tag:hover { border-color: var(--accent); color: var(--accent); }
        .tag.selected { background: var(--accent); border-color: var(--accent); color: #fff; }
        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 480px) { .row { grid-template-columns: 1fr; } }
        .submit-wrap { max-width: 640px; margin: 0 auto; }
        button[type="submit"] {
            width: 100%; padding: 0.9rem; background: var(--accent); color: #fff; border: none;
            border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 600;
            cursor: pointer; transition: background 0.15s, transform 0.1s; letter-spacing: -0.01em;
        }
        button[type="submit"]:hover { background: var(--accent-dk); }
        button[type="submit"]:disabled { background: var(--border); color: var(--muted); cursor: not-allowed; }
        .state-screen { text-align: center; padding: 3rem 1.5rem; max-width: 640px; margin: 0 auto; }
        .state-icon { font-size: 3rem; margin-bottom: 1rem; }
        .state-screen h2 { font-family: 'DM Serif Display', serif; font-size: 1.75rem; margin-bottom: 0.5rem; }
        .state-screen p { color: var(--muted); font-size: 0.95rem; }
        .spinner {
            display: inline-block; width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,0.4);
            border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite;
            vertical-align: middle; margin-right: 0.5rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    `;

    if (screen === "success") {
        return (
            <div className="apply-page">
                <style>{styles}</style>
                <div className="state-screen">
                    <div className="state-icon">✅</div>
                    <h2>Application Submitted</h2>
                    <p>We've received your application and will review it shortly.<br />You'll be notified on Telegram once a decision has been made.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="apply-page">
            <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet" />
            <style>{styles}</style>

            <header>
                <div className="wordmark">Happy Agency</div>
                <h1>Tutor Application</h1>
                <p>Fill in your details below. All fields are required.</p>
            </header>

            {!telegramId && (
                <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>
                    Please open this form from the Happy Tutors Telegram bot.
                </div>
            )}

            {telegramId && (
                <>
                    {screen === "error" && (
                        <div className="state-screen">
                            <div className="state-icon">⚠️</div>
                            <h2>Something went wrong</h2>
                            <p>{errorMessage}</p>
                        </div>
                    )}

                    {screen !== "error" && (
                        <form onSubmit={handleSubmit} noValidate>
                            <div className="card">
                                <div className="card-title">Personal Details</div>

                                <div className="field">
                                    <label>Full Name <span className="required">*</span></label>
                                    <input
                                        type="text" placeholder="e.g. John Tan"
                                        className={errors.fullName ? "error" : ""}
                                        value={fullName}
                                        onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: null })); }}
                                    />
                                    {errors.fullName && <div className="field-error">{errors.fullName}</div>}
                                </div>

                                <div className="row">
                                    <div className="field">
                                        <label>Date of Birth <span className="required">*</span> <span className="hint">DD/MM/YYYY</span></label>
                                        <input
                                            type="date"
                                            className={errors.dateOfBirth ? "error" : ""}
                                            value={dateOfBirth}
                                            onChange={(e) => { setDateOfBirth(e.target.value); setErrors((p) => ({ ...p, dateOfBirth: null })); }}
                                        />
                                        {errors.dateOfBirth && <div className="field-error">{errors.dateOfBirth}</div>}
                                    </div>
                                    <div className="field">
                                        <label>Phone Number <span className="required">*</span></label>
                                        <input
                                            type="tel" placeholder="e.g. 91234567"
                                            className={errors.phone ? "error" : ""}
                                            value={phone}
                                            onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: null })); }}
                                        />
                                        {errors.phone && <div className="field-error">{errors.phone}</div>}
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-title">Teaching Profile</div>

                                <div className="field">
                                    <label>Levels Taught <span className="required">*</span> <span className="hint">Select all that apply</span></label>
                                    <TagGroup options={LEVELS} selected={levels} onToggle={toggle(setLevels, levels)} error={errors.levels} />
                                </div>

                                <div className="field">
                                    <label>Subjects Taught <span className="required">*</span> <span className="hint">Select all that apply</span></label>
                                    <TagGroup options={SUBJECTS} selected={subjects} onToggle={toggle(setSubjects, subjects)} error={errors.subjects} />
                                </div>

                                <div className="field">
                                    <label>Teaching Experience <span className="required">*</span></label>
                                    <textarea
                                        placeholder="e.g. 2 years of private tutoring for Primary 4–6 Maths"
                                        className={errors.experience ? "error" : ""}
                                        value={experience}
                                        onChange={(e) => { setExperience(e.target.value); setErrors((p) => ({ ...p, experience: null })); }}
                                    />
                                    {errors.experience && <div className="field-error">{errors.experience}</div>}
                                </div>

                                <div className="field">
                                    <label>Minimum Expected Hourly Rate (SGD) <span className="required">*</span></label>
                                    <input
                                        type="number" min="0" step="1" placeholder="e.g. 35"
                                        className={errors.hourlyRate ? "error" : ""}
                                        value={hourlyRate}
                                        onChange={(e) => { setHourlyRate(e.target.value); setErrors((p) => ({ ...p, hourlyRate: null })); }}
                                    />
                                    {errors.hourlyRate && <div className="field-error">{errors.hourlyRate}</div>}
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-title">Qualifications</div>
                                <div className="field">
                                    <label>Highest Qualification <span className="required">*</span> <span className="hint">Select all that apply</span></label>
                                    <TagGroup options={QUALIFICATIONS} selected={qualifications} onToggle={toggle(setQualifications, qualifications)} error={errors.qualifications} />
                                </div>
                            </div>

                            <div className="submit-wrap">
                                <button type="submit" disabled={submitting}>
                                    {submitting ? (<><span className="spinner"></span> Submitting...</>) : "Submit Application"}
                                </button>
                            </div>
                        </form>
                    )}
                </>
            )}
        </div>
    );
}
