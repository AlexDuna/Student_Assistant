import React, {useState} from 'react';
import './LoginPage.css';
import {Link} from 'react-router-dom';
import BookModel from '../components/BookModel';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleLogin =  async (e) => {
        e.preventDefault();

        try{
            const response = await fetch("http://localhost:5000/api/login", {
                method: 'POST',
                headers: {
                    'Content-Type' : "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const data = await response.json();

            if(response.ok){
                alert(data.message); //"Login successful"
                //Simulam autentificare locala
                localStorage.setItem('isLoggedIn', 'true');
                navigate('/dashboard'); //Redirectionare catre pagina dashboard
            }else{
                alert(data.error || 'Login failed.');
            }
        }catch(error){
            console.error('Login error.', error);
            alert('Server error.');
        }

        console.log('Login with: ', username, password);
    };

    return(
        <div className='login-page'>
            <div className='login-layout'>
            <div className='canvas-side'>
                    <BookModel/>
            </div>
            <form className='login-form' onSubmit={handleLogin}>
                <h2>Authentication</h2>
                <input
                type="text"
                placeholder="Email or Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                />
                <div className="password-wrapper">
                <input
                type = {showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                />
                <span
                    className="eye-icon"
                    onClick={ () => setShowPassword((prev) => !prev)}
                >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
                </div>

                <button type="submit"> Login</button>

                <p>
                    Don't have an account?
                    <Link to="/register"> Register </Link>
                </p>
            </form>
            </div>
            </div>
    );
};

export default LoginPage;
