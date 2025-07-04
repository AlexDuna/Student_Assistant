import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/DashboadLayout';
import StartPage from './pages/StartPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import ConfirmPage from './pages/ConfirmPage';
import RequestResetPage from './pages/RequestResetPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PublicRoute from './components/PublicRoute';
import FallnikAIPage from './pages/FallnikAIPage';
import MusicPage from './pages/MusicPage';
import AccountTab from './components/AccountTab';
import SettingsTab from './components/SettingsTab';
import SessionsPage from './pages/SessionPage';
import CalendarPage from './pages/CalendarPage';
import PrivacyPolicy from './components/PrivayPolicy';
import TermsOfService from './components/TermsOfService';

function App() {
  return (
    <div className='App'>
      <Routes>
        <Route path="/" element={<StartPage/>} />
        <Route path="/login" 
        element = {
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
        } />
        <Route path="/register" 
        element = {
        <PublicRoute>
          <RegisterPage/>
        </PublicRoute>
        }/>
        <Route path = "/confirm/:token" element={<ConfirmPage/>}/>
        <Route path = "/request-reset" element={<RequestResetPage/>}/>
        <Route path = "/reset-password/:token" element={<ResetPasswordPage/>} />
        
        <Route
          path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
          <Route path="" element={<DashboardPage />} />
          <Route path="ai" element={<FallnikAIPage />} />
          <Route path="music" element={<MusicPage />} />
          <Route path="profile" element={<AccountTab />} />
          <Route path="settings" element={<SettingsTab />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
      </Route>
      <Route path="/privacy" element={<PrivacyPolicy/>} />
      <Route path="/terms" element={<TermsOfService/>} />

      </Routes>
    </div>
  );
}

export default App;
