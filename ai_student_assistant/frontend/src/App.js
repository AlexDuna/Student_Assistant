import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
        <Route path="/dashboard" 
        element = {
          <PublicRoute>
            <DashboardPage/>
          </PublicRoute>
        }/>
        <Route path = "/confirm/:token" element={<ConfirmPage/>}/>
        <Route path = "/request-reset" element={<RequestResetPage/>}/>
        <Route path = "/reset-password/:token" element={<ResetPasswordPage/>} />
        <Route 
          path="/dashboard/ai"
          element={
            <ProtectedRoute>
              <FallnikAIPage/>
            </ProtectedRoute>
          }
          />
      </Routes>
    </div>
  );
}

export default App;
