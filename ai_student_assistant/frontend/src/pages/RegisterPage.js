import React, {useState} from "react";
import './LoginPage.css'
import {Link} from 'react-router-dom';
import BookModel from "../components/BookModel";
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const RegisterPage = () => {
    const [form, setForm] = useState({
        username: '',
        email:'',
        password: '',
        confirmPassword: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState("");
    const [passwordMatchError, setPasswordMatchError] = useState("");


    const evaluatePasswordStrength = (password) => {
        if(password.length < 6 ) return "Too short";
        if(!/[A-Za-z]/.test(password)) return "Needs a letter";
        if(!/\d/.test(password)) return "Needs a number";
        return "Strong";
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });

        if (name === "password") {
            setPasswordStrength(evaluatePasswordStrength(value));
          }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if(form.password !== form.confirmPassword){
            setPasswordMatchError("Passwords do not match.");
            alert("Passwords do not match.");
            return;
        }else {
            setPasswordMatchError(""); // curăță eroarea dacă se potrivesc
          }

        if(passwordStrength !== "Strong"){
            alert("Please use a stronger password.");
            return;
        }

        //Trimitere date la backend
        console.log("Register with: ", form);
    };

    

    return (
        <div className="login-page">
            <div className="login-layout">
                <div className="canvas-side">
                    <BookModel/>
                </div>

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

                    <input
                        type = "email"
                        name = "email"
                        placeholder="Email"
                        value = {form.email}
                        onChange={handleChange}
                        required
                    />
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

                    {passwordStrength && (
                        <p
                        style={{
                            color: passwordStrength === "Strong" ? "green" : "red",
                            fontSize: "0.85rem",
                            marginTop: "-10px",
                            marginBottom: "10px",
                        }}
                        >
                        {passwordStrength}
                        </p>
                    )}

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

                    <p>
                        Already have an account? 
                        <Link to="/login"> Login </Link> 
                    </p>

                </form>
                </div>
            </div>

    );
}

export default RegisterPage;


