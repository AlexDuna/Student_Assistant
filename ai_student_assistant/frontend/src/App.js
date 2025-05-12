import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StartPage from './pages/StartPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function App() {
  return (
    <div className='App'>
      <Routes>
        <Route path="/" element={<StartPage/>} />
        <Route path="/login" element = {<LoginPage />} />
        <Route path="/register" element = {<RegisterPage/>}/>
      </Routes>
    </div>
  );
}

export default App;
