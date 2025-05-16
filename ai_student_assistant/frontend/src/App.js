import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StartPage from './pages/StartPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import ConfirmPage from './pages/ConfirmPage';
import RequestResetPage from './pages/RequestResetPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function App() {
  return (
    <div className='App'>
      <Routes>
        <Route path="/" element={<StartPage/>} />
        <Route path="/login" element = {<LoginPage />} />
        <Route path="/register" element = {<RegisterPage/>}/>
        <Route path="/dashboard" 
        element = {
          <ProtectedRoute>
            <DashboardPage/>
            </ProtectedRoute>
        }/>
        <Route path = "/confirm/:token" element={<ConfirmPage/>}/>
        <Route path = "/request-reset" element={<RequestResetPage/>}/>
        <Route path = "/reset-password/:token" element={<ResetPasswordPage/>} />
      </Routes>
    </div>
  );
}

export default App;
