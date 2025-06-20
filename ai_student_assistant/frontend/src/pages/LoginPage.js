import React, {useEffect, useState} from 'react';
import './LoginPage.css';
import {Link} from 'react-router-dom';
import BookModel from '../components/BookModel';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../utils/config';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [checkingSession, setCheckingSession] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkSession = async () => {
            try {
                const res = await fetch (`${API_URL}/check-session`, {
                    method: "GET",
                    credentials: "include"
                });

                if(res.ok) {
                    //deja e logat
                    navigate("/dashboard");
                }
            }catch(err){
                //sesiunea este invalida sau apare ceva eroare -> ramane in login
            }finally{
                setCheckingSession(false);
            }
        };

        checkSession();
    },[navigate]);

    if(checkingSession) return <p>Loading...</p>;

    const handleLogin =  async (e) => {
        e.preventDefault();
        setErrorMessage(""); //se reseteaza mesajul de eroare la fiecare submit

        try{
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type' : "application/json"
                },
                credentials: 'include',
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const data = await response.json();
            console.log("Login response:", data);

            if(response.ok){
                //alert(data.message);
                navigate('/dashboard'); //Redirectionare catre pagina dashboard
            }else{
                setErrorMessage(data.error || "Login failed. Please try again.");
            }
        }catch(error){
            console.error('Login error.', error);
            setErrorMessage("Server error. Please try again later.");
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
                placeholder="Username"
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

                {errorMessage && (
                    <p style={{color:'red', marginTop: "-10px", fontSize: "0.85rem"}}>
                        {errorMessage}
                    </p>
                )}

                <button type="submit"> Login</button>

                <p style={{textAlign:"center"}}>
                    <Link to="/request-reset" style={{fontSize: "0.9rem", color:"#24146b", textDecoration: "none"}}>
                        Forgot Password?
                    </Link>
                </p>

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
