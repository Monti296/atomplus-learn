import { Navigate, Route, Routes } from 'react-router';
import { SessionGate } from './auth/session-gate';
import { AppShell } from './components/app-shell';
import { ChangePasswordPage } from './pages/change-password-page';
import { LoginPage } from './pages/login-page';
import { NotFoundPage } from './pages/not-found-page';
import { PlaceholderPage } from './pages/placeholder-page';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route element={<SessionGate />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
          <Route index element={<Navigate to="/courses" replace />} />
          <Route
            path="courses"
            element={
              <PlaceholderPage
                title="Courses"
                description="Pick a course and start learning."
              />
            }
          />
          <Route
            path="my-batch"
            element={
              <PlaceholderPage
                title="My Batch"
                description="Courses you have started or finished."
              />
            }
          />
          <Route
            path="certificates"
            element={
              <PlaceholderPage
                title="Certificates"
                description="Your earned certificates."
              />
            }
          />
          <Route
            path="profile"
            element={
              <PlaceholderPage
                title="My Profile"
                description="Your learning journey at a glance."
              />
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
