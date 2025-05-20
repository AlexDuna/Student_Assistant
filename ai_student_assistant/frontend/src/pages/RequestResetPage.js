import React from "react";
import BookModel from "../components/BookModel";
import "../pages/LoginPage.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const RequestResetPage = () =>{
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [checkingSession, setCheckingSession] = useState(true);
    const navigate = useNavigate();

    useEffect (() =>{
        const checkSession = async () =>{
            try{
                const res = await fetch("http://localhost:5000/api/check-session",{
                    method: "GET",
                    credentials: "include"
                });

                if(res.ok) {
                    navigate("/dashboard");
                }
            }catch(err){
                //nu e logat
            }finally{
                setCheckingSession(false);
            }
        };

        checkSession();
    }, [navigate]);

    if(checkingSession) return <p>Loading...</p>;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(""); setError("");

        try{
            const res = await fetch("http://localhost:5000/api/request-password-reset",{
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email})
        });

        const data = await res.json();

        if(res.ok){
            setMessage("Check your email for the reset link.")
        }else{
            setError(data.error || "Something went wrong.")
        }
    }catch(err){
        setError("Server error.");
    }

};

    return (
        <div className="login-page">
            <div className="login-layout">
                <div className="canvas-side">
                    <BookModel />
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <h2>Reset Your Password</h2>

                    <input
                        type="email"
                        placeholder="Enter your email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <button type="submit">Send Reset Link</button>

                    {message && <p className="reset-message" style={{ color: "green" }}>{message}</p>}
                    {error && <p className="reset-message" style={{ color: "red" }}>{error}</p>}
                </form>
            </div>
        </div>
    );
};

export default RequestResetPage;