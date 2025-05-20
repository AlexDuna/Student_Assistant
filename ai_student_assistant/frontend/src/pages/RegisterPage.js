import React from "react";
import './LoginPage.css'
import {Link} from 'react-router-dom';
import BookModel from "../components/BookModel";
import { FaEye, FaEyeSlash} from 'react-icons/fa';
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const RegisterPage = () => {
    const [form, setForm] = useState({
        username: '',
        email:'',
        password: '',
        confirmPassword: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({label:'', color:'gray', level: 0});
    const [passwordMatchError, setPasswordMatchError] = useState("");
    const [submissionError, setSubmissionError] = useState("");
    const [usernameAvailable, setUsernameAvailable] = useState(null);
    const [emailAvailable, setEmailAvailable] = useState(null);
    const [registered, setRegistered] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkSession = async () => {
            try{
                const res = await fetch("http://localhost:5000/api/check-session",{
                    method: "GET",
                    credentials: "include"
                });
                
                if(res.ok){
                    //deja logat, redirectionat
                    navigate("/dashboard");
                }
            }catch(err){
                //nu e logat -> poate ramane pe pagina
            }finally{
                setCheckingSession(false);
            }
        };

        checkSession();
    }, [navigate]);

    if(checkingSession) return <p>Loading...</p>;

    //Functie pentru verificare username in timp real in frontend
    const checkUsername = async (username) => {
        const res = await fetch("http://localhost:5000/api/check-username",{
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({username}),
        });
        const data = await res.json();
        setUsernameAvailable(!data.exists);
    };

    //Functie pentru verificare email in timp real in frontend
    const checkEmail = async (email) =>{
        const res = await fetch("http://localhost:5000/api/check-email",{
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email}),
        });
        const data = await res.json();
        setEmailAvailable(!data.exists);
    }

    const evaluatePasswordStrength = (password) => {
        if(password.length < 6 ) 
            return {label: "Too short", color: "gray", level: 0};
        if(!/[a-z]/.test(password)) 
            return {label: "Add lowercase", color: "red", level: 1};
        if(!/[A-Z]/.test(password)) 
            return {label: "Add uppercase", color:"orange", level: 2};
        if(!/\d/.test(password)) 
            return {label: "Add number", color:"gold", level: 3};
        if(!/[!@#$%^&*(),.?":{}|<>]/.test(password)) 
            return {label: "Add special character", color: "lightgreen", level: 4};

        return {label: "Strong", color:"green", level: 5};
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });

        if (name === "password") {
            setPasswordStrength(evaluatePasswordStrength(value));
          }
        
          if(name === "username"){
            checkUsername(value);
          }

          if(name === "email"){
            checkEmail(value);
          }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(form.password !== form.confirmPassword){
            setPasswordMatchError("Passwords do not match.");
            alert("Passwords do not match.");
            return;
        }else {
            setPasswordMatchError(""); // curăță eroarea dacă se potrivesc
          }

        if(form.password.includes(' ')){
            setPasswordMatchError("Password should not contain spaces.");
            return;
        }else{
            setPasswordMatchError("");
        }

        if(passwordStrength.label !== "Strong"){
            alert("Please use a stronger password.");
            return;
        }

        try{
            const response = await fetch("http://localhost:5000/api/register",{
                method: "POST",
                headers:{
                    "Content-Type" : "application/json"
                },
                body: JSON.stringify({
                    username: form.username,
                    email: form.email,
                    password: form.password
                })
            });

            const data = await response.json();

            if(response.ok){
                alert(data.message); //"User registered successfully"
                setRegistered(true);
            }else if(response.status===409){
                setSubmissionError("Username or email already exists.");
            }else{
                setSubmissionError("Registration failed. Try again later.");
            }
        }catch(error){
            console.error("Error registering user", error);
            alert("Server error");
        }
    };

    

    return (
        <div className="login-page">
            <div className="login-layout">
                <div className="canvas-side">
                    <BookModel/>
                </div>

                {registered ? (
                    <div className="login-form">
                        <h2>Almost there!</h2>
                        <p>Please check your email and click the confirmation link to activate your account.</p>
                    </div>
                ) : (

                <form className="login-form" onSubmit={handleSubmit}>
                    <h2>Create Account</h2>

                    <input
                        type = "text"
                        name = "username"
                        placeholder="Username"
                        value={form.username}
                        onChange={handleChange}
                        required
                    />
                    {form.username && usernameAvailable === false &&(
                        <p style={{color: "red", fontSize: "0.8rem"}}>Username already taken</p>
                    )}

                    <input
                        type = "email"
                        name = "email"
                        placeholder="Email"
                        value = {form.email}
                        onChange={handleChange}
                        required
                    />
                    {form.email && emailAvailable === false &&(
                        <p style={{color: "red", fontSize: "0.8rem"}}>Email already taken</p>
                    )}
                    <div className="password-wrapper">
                    <input
                        type = {showPassword ? "text" : "password"}
                        name = "password"
                        placeholder="Password"
                        value = {form.password}
                        onChange = {handleChange}
                        required
                    />
                    <span
                        className="eye-icon"
                        onClick={ () => setShowPassword((prev) => !prev)}
                    >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                    </div>

                    <div style={{height: "6px", background: "#eee", borderRadius: "4px", marginTop:"5px"}}>
                        <div
                        style={{
                            width: `${(passwordStrength.level / 5) * 100}%`,
                            backgroundColor: passwordStrength.color,
                            height: "100%",
                            borderRadius: "4px",
                            transition: "width 0.3s ease"
                        }}>
                        </div>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: passwordStrength.color, marginTop: "5px"}}>
                        {passwordStrength.label}
                    </p>

                    <div className="password-wrapper">
                    <input
                        type = {showConfirmPassword ? "text" : "password"}
                        name = "confirmPassword"
                        placeholder="Confirm Password"
                        value = {form.confirmPassword}
                        onChange = {handleChange}
                        required
                    />

                    <span
                        className="eye-icon"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                    </div>
                    {passwordMatchError && (
                    <p style={{ color: "red", fontSize: "0.85rem", marginTop: "-10px" }}>
                        {passwordMatchError}
                    </p>
                    )}

                    <button type = "submit" onSubmit={handleSubmit}> Register </button>
                    {submissionError && (
                        <p style={{ color: "red", fontSize: "0.85rem" }}>
                            {submissionError}
                        </p>
                    )}


                    <p>
                        Already have an account? 
                        <Link to="/login"> Login </Link> 
                    </p>

                </form>
                )}
                </div>
            </div>

    );
}

export default RegisterPage;


