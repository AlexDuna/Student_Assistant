import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./LoginPage.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import BookModel from "../components/BookModel";

const ResetPasswordPage = () =>{
    const {token} = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        password: "",
        confirmPassword: ""
    });

    const[message, setMessage]= useState("");
    const[error, setError] = useState("");
    const [passwordStrength, setPasswordStrength] = useState({label: "", color: "", level: 0});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

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

    const handleChange = (e) =>{
        const {name, value} = e.target;
        const updatedForm = {...form, [name]:value};
        setForm(updatedForm);

        if(name==="password"){
            setPasswordStrength(evaluatePasswordStrength(value));
        }
    };

    const handleSubmit = async (e) =>{
        e.preventDefault();

        if(form.password !== form.confirmPassword){
            setMessage("Passwords do not match.");
            setError(true);
            return;
        }

        if(passwordStrength.label !== "Strong"){
            setMessage("Password is not strong enough.");
            setError(true);
            return;
        }

        try{
            const res = await fetch(`http://localhost:5000/api/reset-password/${token}`, {
                method: "POST",
                headers: {"Content-Type" : "application/json"},
                body: JSON.stringify({password: form.password})
            });

            const data = await res.json();

            if(res.ok){
                setMessage("Password reset successfully. Redirectin to login...");
                setError(false);
                setTimeout(() => navigate("/login"), 3000);
            }else{
                setMessage(data.error || "Invalid or expired token.");
                setError(true);
            }
        }catch(err){
            setMessage("Server error. Please try again later.");
            setError(true);
        }
    };

    return (
        <div className="login-page">
            <div className="login-layout">
                <div className="canvas-side">
                    <BookModel />
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <h2>Reset Password</h2>

                    <div className="password-wrapper">
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="New Password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />
                        <span className="eye-icon" onClick={() => setShowPassword(prev => !prev)}>
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </span>
                    </div>

                    {/* Strength bar */}
                    <div style={{ height: "6px", background: "#eee", borderRadius: "4px" }}>
                        <div
                            style={{
                                width: `${(passwordStrength.level / 5) * 100}%`,
                                backgroundColor: passwordStrength.color,
                                height: "100%",
                                borderRadius: "4px",
                                transition: "width 0.3s ease"
                            }}
                        />
                    </div>
                    <p style={{ fontSize: "0.85rem", color: passwordStrength.color }}>
                        {passwordStrength.label}
                    </p>

                    <div className="password-wrapper">
                        <input
                            type={showConfirm ? "text" : "password"}
                            name="confirmPassword"
                            placeholder="Confirm New Password"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                        <span className="eye-icon" onClick={() => setShowConfirm(prev => !prev)}>
                            {showConfirm ? <FaEyeSlash /> : <FaEye />}
                        </span>
                    </div>

                    <button type="submit">Reset Password</button>

                    {message && (
                        <p className="reset-message" style={{ color: error ? "red" : "green" }}>
                            {message}
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordPage;