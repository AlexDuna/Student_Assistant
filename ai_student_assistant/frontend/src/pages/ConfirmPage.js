import React, {useEffect,useState} from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./LoginPage.css";
import { API_URL } from "../utils/config";

const ConfirmPage = () => {
    const {token} = useParams();
    const navigate = useNavigate();
    const [message, setMessage] = useState("Confirming...");
    const [error, setError] = useState(false);

    function isMobile() {
        return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|BlackBerry/i.test(navigator.userAgent);
    }

    useEffect(() => {
        const confirmAccount = async () => {
            try {
                const res = await fetch(`${API_URL}/confirm/${token}`);
                const data = await res.json();

                if(res.ok){
                    setMessage("Account confirmed successfully. You can now log in.");
                    if(!isMobile()){
                    setTimeout(() => navigate("/login"), 3000);
                    }
                }else{
                    setMessage(data.error || "Invalid or expired token.");
                    setError(true);
                }
            }catch(err){
                setMessage("An error occurred. Please try again later.");
                setError(true);
            }
        };

        confirmAccount();

    }, [token, navigate]);

    return (
        <div className="login-page">
            <div className="login-layout">
                <div className="login-form">
                    <h2 style={{ color: error ? "red" : "green" }}>{message}</h2>
                </div>
            </div>
        </div>
    );

};

export default ConfirmPage;