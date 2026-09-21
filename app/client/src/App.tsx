import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { SignInPage } from "./pages/SignInPage";
import { BriefingPage } from "./pages/BriefingPage";
import { AllocationPage } from "./pages/AllocationPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { CompletedPage } from "./pages/CompletedPage";
import { TeamPage } from "./pages/TeamPage";
import { ActivityPage } from "./pages/ActivityPage";

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/signin" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/briefing" element={<RequireAuth><BriefingPage /></RequireAuth>} />
      <Route path="/allocation" element={<RequireAuth><AllocationPage /></RequireAuth>} />
      <Route path="/projects" element={<RequireAuth><ProjectsPage /></RequireAuth>} />
      <Route path="/completed" element={<RequireAuth><CompletedPage /></RequireAuth>} />
      <Route path="/team" element={<RequireAuth><TeamPage /></RequireAuth>} />
      <Route path="/activity" element={<RequireAuth><ActivityPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/briefing" replace />} />
    </Routes>
  );
}
