import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminTutors from "./pages/AdminTutors.jsx";
import AdminJobs from "./pages/AdminJobs.jsx";
import AdminTutorList from "./pages/AdminTutorList.jsx";
import Apply from "./pages/Apply.jsx";
import ConfirmedJobs from "./pages/ConfirmedJobs.jsx";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/admin" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/tutors" element={<AdminTutors />} />
                <Route path="/admin/jobs" element={<AdminJobs />} />
                <Route path="/admin/tutor-list" element={<AdminTutorList />} />
                <Route path="/apply" element={<Apply />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
                <Route path="/admin/jobs/confirmed" element={<ConfirmedJobs />} />
            </Routes>
        </BrowserRouter>
    );
}